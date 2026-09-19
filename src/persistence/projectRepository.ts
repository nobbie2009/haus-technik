import type { Project } from "../models/project";

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  floors: number;
  rooms: number;
}
export interface ProjectRepository {
  list(): Promise<ProjectSummary[]>;
  load(id: string): Promise<Project | null>;
  loadActive(): Promise<Project | null>;
  save(project: Project): Promise<void>;
}
