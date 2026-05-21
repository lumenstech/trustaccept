import type {
  ApprovalRecord,
  ApprovalRequestInputType,
  ListPendingApprovalsInputType,
} from "../../../src/lib/approval-types.js";

export interface ApprovalsClientConfig {
  baseUrl: string;
  /**
   * Static auth token. In demo mode the wrapper accepts any value;
   * the token is sent as the `ta_session` cookie matching the
   * existing middleware contract.
   */
  apiKey?: string;
  /**
   * Injection seam for tests. Defaults to globalThis.fetch.
   */
  fetchImpl?: typeof fetch;
}

/**
 * Thin HTTP client over /api/v1/approvals. Knows nothing about the
 * underlying RiskRecord storage — every method round-trips through
 * the same REST surface external clients use.
 */
export class ApprovalsClient {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(config: ApprovalsClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch;
  }

  async requestApproval(input: ApprovalRequestInputType): Promise<ApprovalRecord> {
    const body = await this.do("POST", "/api/v1/approvals", undefined, input);
    return (body as { approval: ApprovalRecord }).approval;
  }

  async getApprovalStatus(requestId: string): Promise<ApprovalRecord> {
    const path = `/api/v1/approvals/${encodeURIComponent(requestId)}`;
    const body = await this.do("GET", path);
    return (body as { approval: ApprovalRecord }).approval;
  }

  async listPendingApprovals(
    input: ListPendingApprovalsInputType,
  ): Promise<ApprovalRecord[]> {
    const params = new URLSearchParams({ status: "pending" });
    if (input.principal_type) params.set("principal_type", input.principal_type);
    if (input.principal_value) params.set("principal_value", input.principal_value);
    if (input.limit != null) params.set("limit", String(input.limit));
    const body = await this.do("GET", "/api/v1/approvals", params);
    return (body as { approvals: ApprovalRecord[] }).approvals;
  }

  private async do(
    method: "GET" | "POST",
    path: string,
    query?: URLSearchParams,
    jsonBody?: unknown,
  ): Promise<unknown> {
    const queryString = query?.toString();
    const url = `${this.baseUrl}${path}${queryString ? `?${queryString}` : ""}`;
    const headers = new Headers();
    if (jsonBody !== undefined) headers.set("content-type", "application/json");
    if (this.apiKey) headers.set("cookie", `ta_session=${this.apiKey}`);
    const res = await this.fetchImpl(url, {
      method,
      headers,
      body: jsonBody === undefined ? undefined : JSON.stringify(jsonBody),
    });
    if (!res.ok) {
      const text = await safeText(res);
      throw new Error(
        `TrustAccept API ${method} ${path} failed: HTTP ${res.status} ${text}`,
      );
    }
    return res.json();
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 500);
  } catch {
    return "";
  }
}
