import { Injectable } from '@nestjs/common';
import { AdminSession, AdminState } from '../types/session.interface';
@Injectable()
export class SessionService {
  private sessions: Map<number, AdminSession> = new Map();
  createSession(userId: number, state: AdminState): AdminSession {
    const session: AdminSession = {
      userId,
      state,
      step: 0,
      data: {},
    };
    this.sessions.set(userId, session);
    return session;
  }
  startSession(userId: number, state: string): AdminSession {
    const session: AdminSession = {
      userId,
      state: state as AdminState,
      step: 0,
      data: {},
    };
    this.sessions.set(userId, session);
    return session;
  }
  getSession(userId: number): AdminSession | undefined {
    return this.sessions.get(userId);
  }
  updateSession(
    userId: number,
    updates: Partial<AdminSession>,
  ): AdminSession | undefined {
    const session = this.sessions.get(userId);
    if (!session) return undefined;
    Object.assign(session, updates);
    return session;
  }
  updateSessionData(userId: number, newData: Partial<any>) {
    const session = this.getSession(userId);
    if (session) {
      session.data = { ...session.data, ...newData }; // Eski ma'lumotlarni saqlab qolish
    }
  }
  nextStep(userId: number): AdminSession | undefined {
    const session = this.sessions.get(userId);
    if (!session) return undefined;
    session.step++;
    return session;
  }
  setStep(userId: number, step: number) {
    const session = this.sessions.get(userId);
    if (session) session.step = step;
  }
  clearSession(userId: number): void {
    this.sessions.delete(userId);
  }
  isInSession(userId: number): boolean {
    const session = this.sessions.get(userId);
    return session !== undefined && session.state !== AdminState.IDLE;
  }
}
