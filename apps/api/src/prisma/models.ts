import type { TimestampString } from "@prisma/orm-postgres/target/codec-types";
import { type Db } from "./db.ts";
import type { Models } from "./contract.d.ts";

export type SubjectRow = Omit<
  Models.public_Subject,
  "events" | "kpiChanges" | "logs" | "project"
>;

export type ProjectRow = Omit<Models.public_Project, "subjects" | "user">;
export type UserRow = Omit<Models.public_User, "projects">;

export function asDate(value: string): Date {
  return new Date(value);
}

export function asDateOrNull(value: string | null): Date | null {
  return value === null ? null : new Date(value);
}

export function asTimestamp(value: Date | string): TimestampString<3> {
  return (value instanceof Date ? value.toISOString() : value) as TimestampString<3>;
}

export function nowIso(): TimestampString<3> {
  return asTimestamp(new Date());
}

export function hydrateUser(user: UserRow) {
  return {
    ...user,
    createdAt: asDate(user.createdAt),
  };
}

export function hydrateProject(project: ProjectRow) {
  return {
    ...project,
    createdAt: asDate(project.createdAt),
  };
}

export function hydrateSubject(subject: SubjectRow) {
  return {
    ...subject,
    createdAt: asDate(subject.createdAt),
    archivedAt: asDateOrNull(subject.archivedAt),
  };
}

export async function getOwnedSubject(client: Db, userId: string, subjectId: string): Promise<SubjectRow | null> {
  const subject = await client.orm.public.Subject.where({ id: subjectId }).first();
  if (!subject) {
    return null;
  }

  const project = await client.orm.public.Project.where({ id: subject.projectId, userId }).first();
  if (!project) {
    return null;
  }

  return subject;
}

export async function countSubjectsForProject(client: Db, projectId: string): Promise<number> {
  const rows = await client.orm.public.Subject.where({ projectId }).select("id").all();
  return rows.length;
}

export async function projectWithSubjectCount(client: Db, projectId: string, userId: string) {
  const project = await client.orm.public.Project.where({ id: projectId, userId }).first();
  if (!project) {
    return null;
  }

  return {
    ...hydrateProject(project),
    _count: { subjects: await countSubjectsForProject(client, projectId) },
  };
}

export async function listProjectsWithSubjectCounts(client: Db, userId: string) {
  const projects = await client.orm.public.Project.where({ userId })
    .orderBy((project) => project.createdAt.asc())
    .all();

  return Promise.all(
    projects.map(async (project) => ({
      ...hydrateProject(project),
      _count: { subjects: await countSubjectsForProject(client, project.id) },
    })),
  );
}
