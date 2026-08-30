export interface SessionIdentity {
  id?: string;
  sessionVersion?: number;
}

export interface AccountState {
  id: string;
  isActive: boolean;
  sessionVersion: number;
}

export function isSessionCurrent(session: SessionIdentity, account: AccountState | undefined): boolean {
  return Boolean(
    account &&
      account.isActive &&
      session.id === account.id &&
      session.sessionVersion === account.sessionVersion,
  );
}
