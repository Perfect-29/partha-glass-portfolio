import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { DEFAULT_PORTFOLIO_CONTENT } from '../data/portfolioData';
import type { PortfolioContent } from '../data/portfolioData';
import { db } from './firebase';
import { isPortfolioContent } from './portfolioValidation';

export const CONTENT_COLLECTIONS = [
  'profile',
  'projects',
  'skills',
  'education',
  'experience',
  'achievements',
  'certifications',
  'internships',
  'workshops',
  'codingProfiles',
  'publications',
  'resume',
  'socialLinks',
  'siteSettings',
] as const;

export type ContentCollection = (typeof CONTENT_COLLECTIONS)[number];

export interface PortfolioRecord {
  id: string;
  order: number;
  data: unknown;
  updatedAt?: Timestamp;
  publishedAt?: Timestamp;
}

type PortfolioRecords = Record<ContentCollection, PortfolioRecord[]>;

export interface AdminPortfolioSnapshot {
  content: PortfolioContent;
  updatedAt?: Timestamp;
  publishedAt?: Timestamp;
}

interface DraftRecord {
  collection: ContentCollection;
  recordId: string;
  data: unknown;
  order: number;
  deleted: boolean;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

function requireDb() {
  if (!db) throw new Error('Firebase is not configured.');
  return db;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function safeId(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`Invalid Firestore document ID: ${value}`);
  }
  return value;
}

function slug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

function draftDocumentId(collectionName: ContentCollection, recordId: string) {
  return `${collectionName}__${safeId(recordId)}`;
}

function emptyRecords(): PortfolioRecords {
  return {
    profile: [],
    projects: [],
    skills: [],
    education: [],
    experience: [],
    achievements: [],
    certifications: [],
    internships: [],
    workshops: [],
    codingProfiles: [],
    publications: [],
    resume: [],
    socialLinks: [],
    siteSettings: [],
  };
}

function makeDocument(collectionName: ContentCollection, id: string, order: number, data: unknown): PortfolioRecord {
  return { id: safeId(id), order, data };
}

export function contentToRecords(content: PortfolioContent): PortfolioRecords {
  const skills = content.skills.map((skill, index) => {
    const id = safeId(skill.id?.trim() || `${slug(skill.name)}-${index + 1}`);
    return makeDocument('skills', id, index, { ...skill, id });
  });

  return {
    profile: [
      makeDocument('profile', 'main', 0, {
        site: {
          name: content.site.name,
          role: content.site.role,
          email: content.site.email,
          emailPlaceholder: content.site.emailPlaceholder,
        },
        hero: content.hero,
        about: content.about,
      }),
    ],
    projects: content.projects.map((project, index) =>
      makeDocument('projects', project.id, index, project)
    ),
    skills,
    education: content.education.map((entry, index) =>
      makeDocument('education', entry.id, index, entry)
    ),
    experience: content.experience.map((entry, index) =>
      makeDocument('experience', entry.id, index, entry)
    ),
    achievements: content.achievements.map((entry, index) =>
      makeDocument('achievements', entry.id, index, entry)
    ),
    certifications: content.certifications.map((entry, index) =>
      makeDocument('certifications', entry.id, index, entry)
    ),
    internships: content.internships.map((entry, index) =>
      makeDocument('internships', entry.id, index, entry)
    ),
    workshops: content.workshops.map((entry, index) =>
      makeDocument('workshops', entry.id, index, entry)
    ),
    codingProfiles: content.codingProfiles.map((entry, index) =>
      makeDocument('codingProfiles', entry.id, index, entry)
    ),
    publications: content.publications.map((entry, index) =>
      makeDocument('publications', entry.id, index, entry)
    ),
    resume: content.resumes.map((entry, index) =>
      makeDocument('resume', entry.id, index, entry)
    ),
    socialLinks: content.socials.map((entry, index) =>
      makeDocument('socialLinks', entry.id, index, entry)
    ),
    siteSettings: [
      makeDocument('siteSettings', 'main', 0, {
        schemaVersion: 1,
        pageTitle: content.site.pageTitle,
        loader: content.loader,
        techStack: content.techStack,
        stats: content.stats,
        resumeUrl: content.resumeUrl,
      }),
    ],
  };
}

function unpackPublishedDocument(document: { id: string; data: () => DocumentData }): PortfolioRecord | null {
  const raw = document.data();
  if (raw.published !== true) return null;
  const {
    id: _storedId,
    order,
    published,
    publishedAt,
    updatedAt,
    updatedBy: _updatedBy,
    ...data
  } = raw;
  return {
    id: document.id,
    order: typeof order === 'number' ? order : 0,
    data: { ...data, id: document.id, published: published === true },
    updatedAt: updatedAt instanceof Timestamp ? updatedAt : undefined,
    publishedAt: publishedAt instanceof Timestamp ? publishedAt : undefined,
  };
}

function recordsFromPublishedDocuments(
  documents: { id: string; data: () => DocumentData }[]
): PortfolioRecord[] {
  return documents.flatMap((document) => {
    const record = unpackPublishedDocument(document);
    return record ? [record] : [];
  });
}

function orderedData<T>(records: PortfolioRecord[]): T[] {
  return [...records]
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map((record) => record.data as T);
}

function singleton(records: PortfolioRecord[], id: string) {
  const record = records.find((item) => item.id === id);
  return isRecord(record?.data) ? record.data : null;
}

export function recordsToContent(records: PortfolioRecords): PortfolioContent {
  const profile = singleton(records.profile, 'main');
  const siteSettings = singleton(records.siteSettings, 'main');
  const hasSchema = siteSettings?.schemaVersion === 1;
  const storedSite = isRecord(profile?.site) ? profile.site : {};
  const site: PortfolioContent['site'] = {
    ...DEFAULT_PORTFOLIO_CONTENT.site,
    ...(storedSite as Partial<PortfolioContent['site']>),
    pageTitle:
      typeof siteSettings?.pageTitle === 'string'
        ? siteSettings.pageTitle
        : DEFAULT_PORTFOLIO_CONTENT.site.pageTitle,
  };

  const candidate: unknown = {
    ...DEFAULT_PORTFOLIO_CONTENT,
    site,
    hero: profile?.hero ?? DEFAULT_PORTFOLIO_CONTENT.hero,
    about: profile?.about ?? DEFAULT_PORTFOLIO_CONTENT.about,
    loader: siteSettings?.loader ?? DEFAULT_PORTFOLIO_CONTENT.loader,
    techStack: Array.isArray(siteSettings?.techStack) ? siteSettings.techStack : DEFAULT_PORTFOLIO_CONTENT.techStack,
    projects: hasSchema ? orderedData<PortfolioContent['projects'][number]>(records.projects) : DEFAULT_PORTFOLIO_CONTENT.projects,
    skills: hasSchema ? orderedData<PortfolioContent['skills'][number]>(records.skills) : DEFAULT_PORTFOLIO_CONTENT.skills,
    education: hasSchema ? orderedData<PortfolioContent['education'][number]>(records.education) : DEFAULT_PORTFOLIO_CONTENT.education,
    experience: hasSchema ? orderedData<PortfolioContent['experience'][number]>(records.experience) : DEFAULT_PORTFOLIO_CONTENT.experience,
    achievements: hasSchema ? orderedData<PortfolioContent['achievements'][number]>(records.achievements) : DEFAULT_PORTFOLIO_CONTENT.achievements,
    certifications: orderedData<PortfolioContent['certifications'][number]>(records.certifications),
    internships: orderedData<PortfolioContent['internships'][number]>(records.internships),
    workshops: orderedData<PortfolioContent['workshops'][number]>(records.workshops),
    codingProfiles: orderedData<PortfolioContent['codingProfiles'][number]>(records.codingProfiles),
    publications: orderedData<PortfolioContent['publications'][number]>(records.publications),
    resumes: orderedData<PortfolioContent['resumes'][number]>(records.resume),
    socials: hasSchema ? orderedData<PortfolioContent['socials'][number]>(records.socialLinks) : DEFAULT_PORTFOLIO_CONTENT.socials,
    stats: Array.isArray(siteSettings?.stats) ? siteSettings.stats : DEFAULT_PORTFOLIO_CONTENT.stats,
    resumeUrl: typeof siteSettings?.resumeUrl === 'string' ? siteSettings.resumeUrl : DEFAULT_PORTFOLIO_CONTENT.resumeUrl,
  };

  if (!isPortfolioContent(candidate)) {
    throw new Error('Firestore portfolio data failed schema validation.');
  }
  return candidate;
}

function latestTimestamp(records: PortfolioRecord[], field: 'updatedAt' | 'publishedAt') {
  return records
    .map((record) => record[field])
    .filter((timestamp): timestamp is Timestamp => timestamp instanceof Timestamp)
    .sort((left, right) => right.toMillis() - left.toMillis())[0];
}

function flattenRecords(records: PortfolioRecords) {
  return CONTENT_COLLECTIONS.flatMap((collectionName) => records[collectionName]);
}

function createListenerGroup(onError: (error: Error) => void) {
  let stopped = false;
  const unsubscribers: (() => void)[] = [];

  const stop = (error?: Error) => {
    if (stopped) return;
    stopped = true;
    unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
    if (error) onError(error);
  };

  const listen = (subscribe: (fail: (error: Error) => void) => () => void) => {
    if (stopped) return;
    try {
      const unsubscribe = subscribe((error) => stop(error));
      if (stopped) unsubscribe();
      else unsubscribers.push(unsubscribe);
    } catch (error) {
      stop(error instanceof Error ? error : new Error('Unable to start a Firestore listener.'));
    }
  };

  return {
    listen,
    stop: (error?: Error) => stop(error),
    isStopped: () => stopped,
  };
}

export function subscribePublishedPortfolio(
  onData: (content: PortfolioContent) => void,
  onError: (error: Error) => void
) {
  const firestore = requireDb();
  const records = emptyRecords();
  const ready = new Set<ContentCollection>();
  const listeners = createListenerGroup(onError);
  CONTENT_COLLECTIONS.forEach((collectionName) =>
    listeners.listen((fail) =>
      onSnapshot(
        query(collection(firestore, collectionName), where('published', '==', true)),
        (snapshot) => {
          if (listeners.isStopped()) return;
          records[collectionName] = recordsFromPublishedDocuments(snapshot.docs);
          ready.add(collectionName);
          if (ready.size !== CONTENT_COLLECTIONS.length) return;
          try {
            onData(recordsToContent(records));
          } catch (error) {
            listeners.stop(error instanceof Error ? error : new Error('Unable to compose published portfolio data.'));
          }
        },
        fail
      )
    )
  );
  return () => listeners.stop();
}

function draftFromSnapshot(document: { id: string; data: () => DocumentData }): DraftRecord | null {
  const raw = document.data();
  if (
    typeof raw.collection !== 'string' ||
    !CONTENT_COLLECTIONS.includes(raw.collection as ContentCollection) ||
    typeof raw.recordId !== 'string' ||
    typeof raw.order !== 'number' ||
    typeof raw.deleted !== 'boolean'
  ) {
    return null;
  }
  return {
    collection: raw.collection as ContentCollection,
    recordId: raw.recordId,
    data: raw.data,
    order: raw.order,
    deleted: raw.deleted,
    updatedAt: raw.updatedAt instanceof Timestamp ? raw.updatedAt : undefined,
    updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : undefined,
  };
}

export function subscribeAdminPortfolio(
  onData: (snapshot: AdminPortfolioSnapshot) => void,
  onError: (error: Error) => void
) {
  const firestore = requireDb();
  const records = emptyRecords();
  const latestDrafts = new Map<string, DraftRecord>();
  const readyCollections = new Set<ContentCollection>();
  let draftsReady = false;
  const listeners = createListenerGroup(onError);

  const publishSnapshot = () => {
    if (listeners.isStopped()) return;
    if (readyCollections.size !== CONTENT_COLLECTIONS.length || !draftsReady) return;
    const composed = emptyRecords();
    CONTENT_COLLECTIONS.forEach((collectionName) => {
      composed[collectionName] = [...records[collectionName]];
    });

    latestDrafts.forEach((draft) => {
      const current = composed[draft.collection];
      const existingIndex = current.findIndex((record) => record.id === draft.recordId);
      if (draft.deleted) {
        if (existingIndex >= 0) current.splice(existingIndex, 1);
        return;
      }
      const nextRecord: PortfolioRecord = {
        id: draft.recordId,
        order: draft.order,
        data: draft.data,
        updatedAt: draft.updatedAt,
        publishedAt: current[existingIndex]?.publishedAt,
      };
      if (existingIndex >= 0) current[existingIndex] = nextRecord;
      else current.push(nextRecord);
    });

    const allRecords = flattenRecords(composed);
    const draftTimestamps = [...latestDrafts.values()]
      .map((draft) => draft.updatedAt)
      .filter((timestamp): timestamp is Timestamp => timestamp instanceof Timestamp);
    const updatedAt = [...allRecords.map((record) => record.updatedAt), ...draftTimestamps]
      .filter((timestamp): timestamp is Timestamp => timestamp instanceof Timestamp)
      .sort((left, right) => right.toMillis() - left.toMillis())[0];
    try {
      onData({
        content: recordsToContent(composed),
        updatedAt,
        publishedAt: latestTimestamp(allRecords, 'publishedAt'),
      });
    } catch (error) {
      listeners.stop(error instanceof Error ? error : new Error('Unable to compose admin portfolio data.'));
    }
  };

  CONTENT_COLLECTIONS.forEach((collectionName) =>
    listeners.listen((fail) =>
      onSnapshot(
        collection(firestore, collectionName),
        (snapshot) => {
          if (listeners.isStopped()) return;
          records[collectionName] = recordsFromPublishedDocuments(snapshot.docs);
          readyCollections.add(collectionName);
          publishSnapshot();
        },
        fail
      )
    )
  );

  listeners.listen((fail) =>
    onSnapshot(
      collection(firestore, 'drafts'),
      (snapshot) => {
        if (listeners.isStopped()) return;
        latestDrafts.clear();
        snapshot.docs.forEach((document) => {
          const draft = draftFromSnapshot(document);
          if (draft) latestDrafts.set(`${draft.collection}/${draft.recordId}`, draft);
        });
        draftsReady = true;
        publishSnapshot();
      },
      fail
    )
  );

  return () => listeners.stop();
}

async function loadCollectionsAndDrafts() {
  const firestore = requireDb();
  const [collections, drafts] = await Promise.all([
    Promise.all(CONTENT_COLLECTIONS.map(async (collectionName) => ({
      collectionName,
      snapshot: await getDocs(collection(firestore, collectionName)),
    }))),
    getDocs(collection(firestore, 'drafts')),
  ]);
  return { collections, drafts };
}

export async function savePortfolioDraft(content: PortfolioContent, adminUid: string) {
  if (!isPortfolioContent(content)) throw new Error('Cannot save invalid portfolio content.');
  const firestore = requireDb();
  const desired = contentToRecords(content);
  const desiredByKey = new Map<string, { collection: ContentCollection; record: PortfolioRecord }>();
  CONTENT_COLLECTIONS.forEach((collectionName) => {
    desired[collectionName].forEach((record) => {
      desiredByKey.set(`${collectionName}/${record.id}`, { collection: collectionName, record });
    });
  });

  const { collections, drafts } = await loadCollectionsAndDrafts();
  const draftWrites = new Map<string, { collection: ContentCollection; recordId: string; data: unknown; order: number; deleted: boolean }>();

  desiredByKey.forEach(({ collection: collectionName, record }) => {
    draftWrites.set(`${collectionName}/${record.id}`, {
      collection: collectionName,
      recordId: record.id,
      data: record.data,
      order: record.order,
      deleted: false,
    });
  });

  collections.forEach(({ collectionName, snapshot }) => {
    snapshot.docs.forEach((document) => {
      const key = `${collectionName}/${document.id}`;
      if (!desiredByKey.has(key)) {
        draftWrites.set(key, { collection: collectionName, recordId: document.id, data: null, order: 0, deleted: true });
      }
    });
  });

  drafts.docs.forEach((document) => {
    const draft = draftFromSnapshot(document);
    if (!draft) return;
    const key = `${draft.collection}/${draft.recordId}`;
    if (!desiredByKey.has(key)) {
      draftWrites.set(key, {
        collection: draft.collection,
        recordId: draft.recordId,
        data: null,
        order: draft.order,
        deleted: true,
      });
    }
  });

  if (draftWrites.size > 450) {
    throw new Error('This portfolio exceeds the safe Firestore batch limit. Reduce the number of records before saving.');
  }

  const batch = writeBatch(firestore);
  draftWrites.forEach((draft, key) => {
    const draftId = draftDocumentId(draft.collection, draft.recordId);
    batch.set(doc(firestore, 'drafts', draftId), {
      ...draft,
      updatedAt: serverTimestamp(),
      updatedBy: adminUid,
    });
  });
  await batch.commit();
}

export async function publishPortfolioDraft(adminUid: string) {
  const firestore = requireDb();
  const drafts = await getDocs(collection(firestore, 'drafts'));
  if (drafts.size > 225) {
    throw new Error('Too many pending changes for one atomic publish. Reduce the draft size and retry.');
  }
  const batch = writeBatch(firestore);

  drafts.docs.forEach((document) => {
    const draft = draftFromSnapshot(document);
    if (!draft) throw new Error(`Draft ${document.id} has an invalid schema and cannot be published.`);
    const publishedRef = doc(firestore, draft.collection, safeId(draft.recordId));
    if (draft.deleted) {
      batch.delete(publishedRef);
      batch.delete(document.ref);
    } else if (isRecord(draft.data) && draft.data.published === false) {
      batch.delete(publishedRef);
    } else {
      if (!isRecord(draft.data)) throw new Error(`Draft ${document.id} is missing content data.`);
      batch.set(publishedRef, {
        ...draft.data,
        id: draft.recordId,
        order: draft.order,
        published: true,
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: adminUid,
      });
      batch.delete(document.ref);
    }
  });

  await batch.commit();
}
