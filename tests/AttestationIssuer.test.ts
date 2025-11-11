// tests/AttestationIssuer.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { 
  stringUtf8CV, 
  uintCV, 
  principalCV, 
  bufferCV, 
  noneCV, 
  someCV,
  listCV 
} from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_ISSUER_NOT_WHITELISTED = 101;
const ERR_INVALID_SCHEMA = 102;
const ERR_INVALID_DATA_HASH = 103;
const ERR_INVALID_EXPIRY = 104;
const ERR_ATTESTATION_ALREADY_EXISTS = 105;
const ERR_ATTESTATION_NOT_FOUND = 106;
const ERR_INVALID_IDENTITY_ID = 107;
const ERR_MAX_ATTESTATIONS_EXCEEDED = 108;
const ERR_INVALID_REVOCATION_REASON = 109;
const ERR_ALREADY_REVOKED = 110;
const ERR_INVALID_SCHEMA_VERSION = 111;
const ERR_INVALID_ISSUER_FEE = 112;
const ERR_INVALID_MAX_SCHEMAS = 113;
const ERR_SCHEMA_ALREADY_EXISTS = 114;
const ERR_SCHEMA_NOT_FOUND = 115;
const ERR_INVALID_SCHEMA_NAME = 116;
const ERR_INVALID_WHITELIST_UPDATE = 117;

interface IssuerData {
  whitelisted: boolean;
  feeExempt: boolean;
  maxAttestationsPerIdentity: number;
  createdAt: number;
}

interface SchemaData {
  version: number;
  description: string;
  fields: string[];
  active: boolean;
  createdAt: number;
}

interface AttestationData {
  identityId: number;
  schema: string;
  dataHash: Uint8Array;
  issuer: string;
  expiry: number | null;
  revoked: boolean;
  revocationReason: string | null;
  timestamp: number;
  version: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class AttestationIssuerMock {
  state: {
    nextAttestationId: number;
    maxAttestations: number;
    issuerFee: number;
    adminPrincipal: string;
    contractUri: string;
    issuers: Map<string, IssuerData>;
    schemas: Map<string, SchemaData>;
    attestations: Map<number, AttestationData>;
    identityAttestationCount: Map<number, number>;
    schemaAttestationCount: Map<string, number>;
    issuerAttestationCount: Map<string, number>;
  } = {
    nextAttestationId: 0,
    maxAttestations: 5000,
    issuerFee: 500,
    adminPrincipal: "ST1TEST",
    contractUri: "",
    issuers: new Map(),
    schemas: new Map(),
    attestations: new Map(),
    identityAttestationCount: new Map(),
    schemaAttestationCount: new Map(),
    issuerAttestationCount: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextAttestationId: 0,
      maxAttestations: 5000,
      issuerFee: 500,
      adminPrincipal: "ST1TEST",
      contractUri: "",
      issuers: new Map(),
      schemas: new Map(),
      attestations: new Map(),
      identityAttestationCount: new Map(),
      schemaAttestationCount: new Map(),
      issuerAttestationCount: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }

  isAdmin(): boolean {
    return this.caller === this.state.adminPrincipal;
  }

  isWhitelistedIssuer(issuer: string): boolean {
    const data = this.state.issuers.get(issuer);
    return data?.whitelisted ?? false;
  }

  setAdmin(newAdmin: string): Result<boolean> {
    if (!this.isAdmin()) {
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    }
    this.state.adminPrincipal = newAdmin;
    return { ok: true, value: true };
  }

  setMaxAttestations(newMax: number): Result<boolean> {
    if (!this.isAdmin()) {
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    }
    if (newMax <= 0) {
      return { ok: false, value: ERR_INVALID_MAX_SCHEMAS };
    }
    this.state.maxAttestations = newMax;
    return { ok: true, value: true };
  }

  setIssuerFee(newFee: number): Result<boolean> {
    if (!this.isAdmin()) {
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    }
    if (newFee < 0) {
      return { ok: false, value: ERR_INVALID_ISSUER_FEE };
    }
    this.state.issuerFee = newFee;
    return { ok: true, value: true };
  }

  setContractUri(uri: string): Result<boolean> {
    if (!this.isAdmin()) {
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    }
    if (uri.length > 256) {
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    }
    this.state.contractUri = uri;
    return { ok: true, value: true };
  }

  whitelistIssuer(issuer: string, feeExempt: boolean, maxPerIdentity: number): Result<boolean> {
    if (!this.isAdmin()) {
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    }
    if (maxPerIdentity <= 0) {
      return { ok: false, value: ERR_INVALID_WHITELIST_UPDATE };
    }
    this.state.issuers.set(issuer, {
      whitelisted: true,
      feeExempt,
      maxAttestationsPerIdentity: maxPerIdentity,
      createdAt: this.blockHeight,
    });
    return { ok: true, value: true };
  }

  updateIssuerLimit(issuer: string, newLimit: number): Result<boolean> {
    if (!this.isAdmin()) {
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    }
    if (newLimit <= 0) {
      return { ok: false, value: ERR_INVALID_WHITELIST_UPDATE };
    }
    const issuerData = this.state.issuers.get(issuer);
    if (!issuerData) {
      return { ok: false, value: ERR_ISSUER_NOT_WHITELISTED };
    }
    this.state.issuers.set(issuer, {
      ...issuerData,
      maxAttestationsPerIdentity: newLimit,
    });
    return { ok: true, value: true };
  }

  dewhitelistIssuer(issuer: string): Result<boolean> {
    if (!this.isAdmin()) {
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    }
    this.state.issuers.delete(issuer);
    return { ok: true, value: true };
  }

  createSchema(
    schemaName: string,
    version: number,
    description: string,
    fields: string[]
  ): Result<boolean> {
    if (!this.isAdmin() && !this.isWhitelistedIssuer(this.caller)) {
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    }
    if (schemaName.length === 0 || schemaName.length > 64) {
      return { ok: false, value: ERR_INVALID_SCHEMA_NAME };
    }
    if (version <= 0) {
      return { ok: false, value: ERR_INVALID_SCHEMA_VERSION };
    }
    if (description.length > 128) {
      return { ok: false, value: ERR_INVALID_SCHEMA_NAME };
    }
    if (fields.length > 10) {
      return { ok: false, value: ERR_INVALID_SCHEMA_NAME };
    }
    if (this.state.schemas.has(schemaName)) {
      return { ok: false, value: ERR_SCHEMA_ALREADY_EXISTS };
    }
    this.state.schemas.set(schemaName, {
      version,
      description,
      fields,
      active: true,
      createdAt: this.blockHeight,
    });
    return { ok: true, value: true };
  }

  updateSchema(
    schemaName: string,
    newVersion: number,
    newDescription: string | null,
    newFields: string[] | null,
    active: boolean
  ): Result<boolean> {
    if (!this.isAdmin()) {
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    }
    const schemaData = this.state.schemas.get(schemaName);
    if (!schemaData) {
      return { ok: false, value: ERR_SCHEMA_NOT_FOUND };
    }
    if (newVersion <= 0) {
      return { ok: false, value: ERR_INVALID_SCHEMA_VERSION };
    }
    if (newDescription && newDescription.length > 128) {
      return { ok: false, value: ERR_INVALID_SCHEMA_NAME };
    }
    if (newFields && newFields.length > 10) {
      return { ok: false, value: ERR_INVALID_SCHEMA_NAME };
    }
    this.state.schemas.set(schemaName, {
      version: newVersion,
      description: newDescription ?? schemaData.description,
      fields: newFields ?? schemaData.fields,
      active,
      createdAt: schemaData.createdAt,
    });
    return { ok: true, value: true };
  }

  issueAttestation(
    identityId: number,
    schema: string,
    dataHash: Uint8Array,
    expiry: number | null
  ): Result<number> {
    const nextId = this.state.nextAttestationId;
    if (nextId >= this.state.maxAttestations) {
      return { ok: false, value: ERR_MAX_ATTESTATIONS_EXCEEDED };
    }
    if (identityId <= 0) {
      return { ok: false, value: ERR_INVALID_IDENTITY_ID };
    }
    if (dataHash.length !== 32) {
      return { ok: false, value: ERR_INVALID_DATA_HASH };
    }
    if (expiry !== null && expiry < this.blockHeight) {
      return { ok: false, value: ERR_INVALID_EXPIRY };
    }
    const schemaData = this.state.schemas.get(schema);
    if (!schemaData) {
      return { ok: false, value: ERR_INVALID_SCHEMA };
    }
    if (!schemaData.active) {
      return { ok: false, value: ERR_INVALID_SCHEMA };
    }
    const issuerData = this.state.issuers.get(this.caller);
    if (!issuerData || !issuerData.whitelisted) {
      return { ok: false, value: ERR_ISSUER_NOT_WHITELISTED };
    }
    const countPerIdentity = this.state.identityAttestationCount.get(identityId) ?? 0;
    if (countPerIdentity >= issuerData.maxAttestationsPerIdentity) {
      return { ok: false, value: ERR_INVALID_WHITELIST_UPDATE };
    }
    if (this.state.attestations.has(nextId)) {
      return { ok: false, value: ERR_ATTESTATION_ALREADY_EXISTS };
    }
    const fee = issuerData.feeExempt ? 0 : this.state.issuerFee;
    const admin = this.state.adminPrincipal;
    if (fee > 0) {
      this.stxTransfers.push({ amount: fee, from: this.caller, to: admin });
    }
    this.state.attestations.set(nextId, {
      identityId,
      schema,
      dataHash,
      issuer: this.caller,
      expiry,
      revoked: false,
      revocationReason: null,
      timestamp: this.blockHeight,
      version: schemaData.version,
    });
    this.state.identityAttestationCount.set(identityId, countPerIdentity + 1);
    const schemaCount = this.state.schemaAttestationCount.get(schema) ?? 0;
    this.state.schemaAttestationCount.set(schema, schemaCount + 1);
    const issuerCount = this.state.issuerAttestationCount.get(this.caller) ?? 0;
    this.state.issuerAttestationCount.set(this.caller, issuerCount + 1);
    this.state.nextAttestationId = nextId + 1;
    return { ok: true, value: nextId };
  }

  revokeAttestation(attestationId: number, reason: string | null): Result<boolean> {
    const attData = this.state.attestations.get(attestationId);
    if (!attData) {
      return { ok: false, value: ERR_ATTESTATION_NOT_FOUND };
    }
    if (this.caller !== attData.issuer && !this.isAdmin()) {
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    }
    if (attData.revoked) {
      return { ok: false, value: ERR_ALREADY_REVOKED };
    }
    if (reason && reason.length > 64) {
      return { ok: false, value: ERR_INVALID_REVOCATION_REASON };
    }
    this.state.attestations.set(attestationId, {
      ...attData,
      revoked: true,
      revocationReason: reason,
    });
    return { ok: true, value: true };
  }

  getAttestation(id: number): AttestationData | null {
    return this.state.attestations.get(id) ?? null;
  }

  getIssuerStatus(issuer: string): IssuerData | null {
    return this.state.issuers.get(issuer) ?? null;
  }

  getSchema(schemaName: string): SchemaData | null {
    return this.state.schemas.get(schemaName) ?? null;
  }

  getAttestationCountForIdentity(identityId: number): number {
    return this.state.identityAttestationCount.get(identityId) ?? 0;
  }

  getNextAttestationId(): number {
    return this.state.nextAttestationId;
  }

  getMaxAttestations(): number {
    return this.state.maxAttestations;
  }

  getIssuerFee(): number {
    return this.state.issuerFee;
  }

  getAdmin(): string {
    return this.state.adminPrincipal;
  }

  getContractUri(): string {
    return this.state.contractUri;
  }

  getAttestationsByIdentity(identityId: number): Result<{ count: number; nextId: number }> {
    return {
      ok: true,
      value: {
        count: this.getAttestationCountForIdentity(identityId),
        nextId: this.getNextAttestationId(),
      },
    };
  }

  getAttestationsBySchema(schema: string): Result<number> {
    return {
      ok: true,
      value: this.state.schemaAttestationCount.get(schema) ?? 0,
    };
  }

  getAttestationsByIssuer(issuer: string): Result<number> {
    return {
      ok: true,
      value: this.state.issuerAttestationCount.get(issuer) ?? 0,
    };
  }
}

describe("AttestationIssuer", () => {
  let contract: AttestationIssuerMock;

  beforeEach(() => {
    contract = new AttestationIssuerMock();
    contract.reset();
  });

  it("whitelists an issuer successfully", () => {
    const result = contract.whitelistIssuer("ST2TEST", true, 100);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const issuerStatus = contract.getIssuerStatus("ST2TEST");
    expect(issuerStatus?.whitelisted).toBe(true);
    expect(issuerStatus?.feeExempt).toBe(true);
    expect(issuerStatus?.maxAttestationsPerIdentity).toBe(100);
  });

  it("creates a schema successfully", () => {
    const result = contract.createSchema("refugee-status", 1, "Refugee verification schema", ["name", "dob"]);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const schema = contract.getSchema("refugee-status");
    expect(schema?.version).toBe(1);
    expect(schema?.description).toBe("Refugee verification schema");
    expect(schema?.fields).toEqual(["name", "dob"]);
    expect(schema?.active).toBe(true);
  });

  it("issues an attestation successfully", () => {
    contract.whitelistIssuer("ST2TEST", false, 10);
    contract.createSchema("refugee-status", 1, "Refugee verification", ["status"]);
    contract.caller = "ST2TEST";
    const hash = new Uint8Array(32).fill(1);
    const result = contract.issueAttestation(1, "refugee-status", hash, null);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const attestation = contract.getAttestation(0);
    expect(attestation?.identityId).toBe(1);
    expect(attestation?.schema).toBe("refugee-status");
    expect(attestation?.dataHash).toEqual(hash);
    expect(attestation?.issuer).toBe("ST2TEST");
    expect(attestation?.revoked).toBe(false);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST2TEST", to: "ST1TEST" }]);
    expect(contract.getAttestationCountForIdentity(1)).toBe(1);
  });

  it("rejects issuance without whitelisted issuer", () => {
    contract.createSchema("refugee-status", 1, "Refugee verification", ["status"]);
    contract.caller = "ST3FAKE";
    const hash = new Uint8Array(32).fill(1);
    const result = contract.issueAttestation(1, "refugee-status", hash, null);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ISSUER_NOT_WHITELISTED);
  });

  it("rejects issuance with invalid schema", () => {
    contract.whitelistIssuer("ST2TEST", false, 10);
    contract.caller = "ST2TEST";
    const hash = new Uint8Array(32).fill(1);
    const result = contract.issueAttestation(1, "invalid-schema", hash, null);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_SCHEMA);
  });

  it("rejects issuance exceeding max per identity", () => {
    contract.whitelistIssuer("ST2TEST", false, 1);
    contract.createSchema("refugee-status", 1, "Refugee verification", ["status"]);
    contract.caller = "ST2TEST";
    const hash = new Uint8Array(32).fill(1);
    contract.issueAttestation(1, "refugee-status", hash, null);
    const result = contract.issueAttestation(1, "refugee-status", hash, null);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_WHITELIST_UPDATE);
  });

  it("revokes an attestation successfully", () => {
    contract.whitelistIssuer("ST2TEST", false, 10);
    contract.createSchema("refugee-status", 1, "Refugee verification", ["status"]);
    contract.caller = "ST2TEST";
    const hash = new Uint8Array(32).fill(1);
    contract.issueAttestation(1, "refugee-status", hash, null);
    const revokeResult = contract.revokeAttestation(0, "fraud");
    expect(revokeResult.ok).toBe(true);
    expect(revokeResult.value).toBe(true);
    const attestation = contract.getAttestation(0);
    expect(attestation?.revoked).toBe(true);
    expect(attestation?.revocationReason).toBe("fraud");
  });

  it("rejects revocation by non-issuer", () => {
    contract.whitelistIssuer("ST2TEST", false, 10);
    contract.createSchema("refugee-status", 1, "Refugee verification", ["status"]);
    contract.caller = "ST2TEST";
    const hash = new Uint8Array(32).fill(1);
    contract.issueAttestation(1, "refugee-status", hash, null);
    contract.caller = "ST3FAKE";
    const result = contract.revokeAttestation(0, "test");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects already revoked attestation", () => {
    contract.whitelistIssuer("ST2TEST", false, 10);
    contract.createSchema("refugee-status", 1, "Refugee verification", ["status"]);
    contract.caller = "ST2TEST";
    const hash = new Uint8Array(32).fill(1);
    contract.issueAttestation(1, "refugee-status", hash, null);
    contract.revokeAttestation(0, "test");
    const result = contract.revokeAttestation(0, "retry");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ALREADY_REVOKED);
  });

  it("sets issuer fee successfully", () => {
    const result = contract.setIssuerFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.getIssuerFee()).toBe(1000);
    contract.whitelistIssuer("ST2TEST", false, 10);
    contract.createSchema("refugee-status", 1, "Refugee verification", ["status"]);
    contract.caller = "ST2TEST";
    const hash = new Uint8Array(32).fill(1);
    contract.issueAttestation(1, "refugee-status", hash, null);
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST2TEST", to: "ST1TEST" }]);
  });

  it("updates schema successfully", () => {
    contract.createSchema("refugee-status", 1, "Old desc", ["old-field"]);
    const result = contract.updateSchema("refugee-status", 2, "New desc", ["new-field"], true);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const schema = contract.getSchema("refugee-status");
    expect(schema?.version).toBe(2);
    expect(schema?.description).toBe("New desc");
    expect(schema?.fields).toEqual(["new-field"]);
    expect(schema?.active).toBe(true);
  });

  it("rejects schema update without admin", () => {
    contract.caller = "ST2FAKE";
    const result = contract.updateSchema("refugee-status", 2, null, null, false);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("returns attestation counts correctly", () => {
    contract.whitelistIssuer("ST2TEST", false, 10);
    contract.createSchema("refugee-status", 1, "Refugee verification", ["status"]);
    contract.caller = "ST2TEST";
    const hash = new Uint8Array(32).fill(1);
    contract.issueAttestation(1, "refugee-status", hash, null);
    contract.issueAttestation(2, "refugee-status", hash, null);
    const identityResult = contract.getAttestationsByIdentity(1);
    expect(identityResult.ok).toBe(true);
    expect(identityResult.value.count).toBe(1);
    const schemaResult = contract.getAttestationsBySchema("refugee-status");
    expect(schemaResult.ok).toBe(true);
    expect(schemaResult.value).toBe(2);
    const issuerResult = contract.getAttestationsByIssuer("ST2TEST");
    expect(issuerResult.ok).toBe(true);
    expect(issuerResult.value).toBe(2);
  });

  it("rejects schema creation with duplicate name", () => {
    contract.createSchema("refugee-status", 1, "Desc", ["field"]);
    const result = contract.createSchema("refugee-status", 2, "New desc", ["new-field"]);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_SCHEMA_ALREADY_EXISTS);
  });

  it("rejects schema with invalid name length", () => {
    const longName = "a".repeat(65);
    const result = contract.createSchema(longName, 1, "Desc", ["field"]);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_SCHEMA_NAME);
  });

  it("rejects issuance with invalid data hash length", () => {
    contract.whitelistIssuer("ST2TEST", false, 10);
    contract.createSchema("refugee-status", 1, "Refugee verification", ["status"]);
    contract.caller = "ST2TEST";
    const shortHash = new Uint8Array(16);
    const result = contract.issueAttestation(1, "refugee-status", shortHash, null);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DATA_HASH);
  });

  it("rejects issuance with past expiry", () => {
    contract.whitelistIssuer("ST2TEST", false, 10);
    contract.createSchema("refugee-status", 1, "Refugee verification", ["status"]);
    contract.caller = "ST2TEST";
    contract.blockHeight = 10;
    const hash = new Uint8Array(32).fill(1);
    const result = contract.issueAttestation(1, "refugee-status", hash, 5);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_EXPIRY);
  });

  it("dewhitelists issuer successfully", () => {
    contract.whitelistIssuer("ST2TEST", true, 10);
    const result = contract.dewhitelistIssuer("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.getIssuerStatus("ST2TEST")).toBeNull();
  });

  it("rejects dewhitelist without admin", () => {
    contract.caller = "ST2FAKE";
    const result = contract.dewhitelistIssuer("ST2TEST");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects max attestations exceeded", () => {
    contract.state.maxAttestations = 0;
    contract.whitelistIssuer("ST2TEST", false, 10);
    contract.createSchema("refugee-status", 1, "Refugee verification", ["status"]);
    contract.caller = "ST2TEST";
    const hash = new Uint8Array(32).fill(1);
    const result = contract.issueAttestation(1, "refugee-status", hash, null);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_ATTESTATIONS_EXCEEDED);
  });

  it("issues fee-exempt attestation", () => {
    contract.whitelistIssuer("ST2TEST", true, 10);
    contract.createSchema("refugee-status", 1, "Refugee verification", ["status"]);
    contract.caller = "ST2TEST";
    const hash = new Uint8Array(32).fill(1);
    const result = contract.issueAttestation(1, "refugee-status", hash, null);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    expect(contract.stxTransfers.length).toBe(0);
  });

  it("updates issuer limit successfully", () => {
    contract.whitelistIssuer("ST2TEST", false, 5);
    const result = contract.updateIssuerLimit("ST2TEST", 20);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const issuerStatus = contract.getIssuerStatus("ST2TEST");
    expect(issuerStatus?.maxAttestationsPerIdentity).toBe(20);
  });

  it("rejects update issuer limit without admin", () => {
    contract.caller = "ST3FAKE";
    const result = contract.updateIssuerLimit("ST2TEST", 20);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });
});