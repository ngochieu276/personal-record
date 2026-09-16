import type { TimestampString } from "@prisma/orm-postgres/target/codec-types";
import { db } from "./db.ts";
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

export async function projectWithSubjectCount(projectId: string, userId: string) {
  const row = await db.orm.public.Project.where({ id: projectId, userId })
    .include("subjects", (subjects) => subjects.count())
    .first();

  if (!row) {
    return null;
  }

  const { subjects, ...project } = row;
  return {
    ...hydrateProject(project),
    _count: { subjects },
  };
}
