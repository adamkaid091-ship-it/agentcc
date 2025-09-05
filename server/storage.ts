import {
  users,
  submissions,
  type User,
  type UpsertUser,
  type Submission,
  type InsertSubmission,
} from "@shared/schema";
import { db, getFreshDb } from "./db";
import { eq, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(email: string, role: string): Promise<User | undefined>;
  
  // Submission operations
  createSubmission(submission: InsertSubmission & { agentId: string }): Promise<Submission>;
  getAllSubmissions(): Promise<(Submission & { agentName: string })[]>;
  getSubmissionsByAgent(agentId: string): Promise<Submission[]>;
  getSubmissionStats(): Promise<{
    total: number;
    feeding: number;
    maintenance: number;
    todayCount: number;
  }>;
  getActiveAgentsCount(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.warn('Primary DB connection failed for getUser, trying fresh connection:', error);
      try {
        const freshDb = getFreshDb();
        const [user] = await freshDb.select().from(users).where(eq(users.id, id));
        return user;
      } catch (freshError) {
        console.error('Fresh DB connection also failed for getUser:', freshError);
        throw freshError;
      }
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Submission operations
  async createSubmission(submissionData: InsertSubmission & { agentId: string }): Promise<Submission> {
    const [submission] = await db
      .insert(submissions)
      .values(submissionData)
      .returning();
    return submission;
  }

  async getAllSubmissions(): Promise<(Submission & { agentName: string })[]> {
    const result = await db
      .select({
        id: submissions.id,
        clientName: submissions.clientName,
        government: submissions.government,
        atmCode: submissions.atmCode,
        serviceType: submissions.serviceType,
        agentId: submissions.agentId,
        createdAt: submissions.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(submissions)
      .leftJoin(users, eq(submissions.agentId, users.id))
      .orderBy(desc(submissions.createdAt));
    
    return result.map((row: any) => ({
      ...row,
      agentName: row.firstName && row.lastName 
        ? `${row.firstName} ${row.lastName}`.trim()
        : row.firstName || row.lastName || 'Unknown Agent'
    }));
  }

  async getSubmissionsByAgent(agentId: string): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .where(eq(submissions.agentId, agentId))
      .orderBy(desc(submissions.createdAt));
  }

  async getSubmissionStats(): Promise<{
    total: number;
    feeding: number;
    maintenance: number;
    todayCount: number;
  }> {
    const total = await db.select().from(submissions);
    const feeding = total.filter((s: any) => s.serviceType === 'feeding').length;
    const maintenance = total.filter((s: any) => s.serviceType === 'maintenance').length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = total.filter((s: any) => s.createdAt && s.createdAt >= today).length;

    return {
      total: total.length,
      feeding,
      maintenance,
      todayCount,
    };
  }

  async getActiveAgentsCount(): Promise<number> {
    const agents = await db
      .select()
      .from(users)
      .where(eq(users.role, 'agent'));
    return agents.length;
  }

  async updateUserRole(email: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role: role as 'agent' | 'manager', updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();
