// tests/IdentityRegistry.test.ts

import { describe, it, expect, beforeEach } from "vitest";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_HASH = 101;
const ERR_IDENTITY_ALREADY_EXISTS = 106;
const ERR_IDENTITY_NOT_FOUND = 107;
const ERR_INVALID_PROOF = 108;
const ERR_AUTHORITY_NOT_VERIFIED = 109;
const ERR_MAX_IDENTITIES_EXCEEDED = 114;
const ERR_INVALID_IDENTITY_TYPE = 115;
const ERR_INVALID_EXPIRY = 116;
const ERR_INVALID_LOCATION = 117;
const ERR_INVALID_COUNTRY = 118;
const ERR_INVALID_GENDER = 119;
const ERR_INVALID_ETHNICITY = 120;
const ERR_INVALID_RELIGION = 121;
const ERR_INVALID_LANGUAGE = 122;
const ERR_INVALID_EDUCATION = 123;
const ERR_INVALID_OCCUPATION = 124;
const ERR_INVALID_MARITAL_STATUS = 125;
const ERR_INVALID_DEPENDENTS = 126;
const ERR_INVALID_HEALTH_STATUS = 127;
const ERR_INVALID_MIN_AGE = 110;
const ERR_INVALID_MAX_AGE = 111;
const ERR_INVALID_VERIFIER = 105;
const ERR_INVALID_REGISTRATION_FEE = 130;

interface Identity {
  owner: string;
  hash: Uint8Array;
  createdAt: number;
  updatedAt: number;
  status: boolean;
  identityType: string;
  expiry: number;
  location: string;
  country: string;
  gender: string;
  ethnicity: string;
  religion: string;
  language: string;
  education: string;
  occupation: string;
  maritalStatus: string;
  dependents: number;
  healthStatus: string;
  disability: boolean;
  vaccination: boolean;
  minAge: number;
  maxAge: number;
}

interface IdentityUpdate {
  updateHash: Uint8Array;
  updateTimestamp: number;
  updater: string;
}

type Result<T> = { ok: true; value: T } | { ok: false; value: number };

class IdentityRegistryMock {
  state: {
    nextIdentityId: number;
    maxIdentities: number;
    registrationFee: number;
    authorityContract: string | null;
    verifierList: string[];
    identities: Map<number, Identity>;
    identitiesByOwner: Map<string, number>;
    identityUpdates: Map<number, IdentityUpdate>;
  } = {
    nextIdentityId: 0,
    maxIdentities: 1000000,
    registrationFee: 100,
    authorityContract: null,
    verifierList: [],
    identities: new Map(),
    identitiesByOwner: new Map(),
    identityUpdates: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextIdentityId: 0,
      maxIdentities: 1000000,
      registrationFee: 100,
      authorityContract: null,
      verifierList: [],
      identities: new Map(),
      identitiesByOwner: new Map(),
      identityUpdates: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setRegistrationFee(newFee: number): Result<boolean> {
    if (this.state.authorityContract === null) {
      return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    }
    if (newFee < 0) {
      return { ok: false, value: ERR_INVALID_REGISTRATION_FEE };
    }
    this.state.registrationFee = newFee;
    return { ok: true, value: true };
  }

  addVerifier(verifier: string): Result<boolean> {
    if (this.caller !== this.state.authorityContract) {
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    }
    if (this.state.verifierList.includes(verifier)) {
      return { ok: false, value: ERR_INVALID_VERIFIER };
    }
    this.state.verifierList.push(verifier);
    return { ok: true, value: true };
  }

  removeVerifier(verifier: string): Result<boolean> {
    if (this.caller !== this.state.authorityContract) {
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    }
    if (!this.state.verifierList.includes(verifier)) {
      return { ok: false, value: ERR_INVALID_VERIFIER };
    }
    this.state.verifierList = this.state.verifierList.filter(v => v !== verifier);
    return { ok: true, value: true };
  }

  registerIdentity(
    hash: Uint8Array,
    identityType: string,
    expiry: number,
    location: string,
    country: string,
    gender: string,
    ethnicity: string,
    religion: string,
    language: string,
    education: string,
    occupation: string,
    maritalStatus: string,
    dependents: number,
    healthStatus: string,
    disability: boolean,
    vaccination: boolean,
    minAge: number,
    maxAge: number
  ): Result<number> {
    if (this.state.nextIdentityId >= this.state.maxIdentities) {
      return { ok: false, value: ERR_MAX_IDENTITIES_EXCEEDED };
    }
    if (hash.length !== 32) return { ok: false, value: ERR_INVALID_HASH };
    if (!["refugee", "asylum", "displaced"].includes(identityType)) {
      return { ok: false, value: ERR_INVALID_IDENTITY_TYPE };
    }
    if (expiry <= this.blockHeight) return { ok: false, value: ERR_INVALID_EXPIRY };
    if (location.length === 0 || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (country.length === 0 || country.length > 50) return { ok: false, value: ERR_INVALID_COUNTRY };
    if (!["male", "female", "other"].includes(gender)) return { ok: false, value: ERR_INVALID_GENDER };
    if (ethnicity.length > 50) return { ok: false, value: ERR_INVALID_ETHNICITY };
    if (religion.length > 50) return { ok: false, value: ERR_INVALID_RELIGION };
    if (language.length > 50) return { ok: false, value: ERR_INVALID_LANGUAGE };
    if (education.length > 50) return { ok: false, value: ERR_INVALID_EDUCATION };
    if (occupation.length > 50) return { ok: false, value: ERR_INVALID_OCCUPATION };
    if (!["single", "married", "divorced"].includes(maritalStatus)) {
      return { ok: false, value: ERR_INVALID_MARITAL_STATUS };
    }
    if (dependents > 20) return { ok: false, value: ERR_INVALID_DEPENDENTS };
    if (healthStatus.length > 50) return { ok: false, value: ERR_INVALID_HEALTH_STATUS };
    if (minAge > 100) return { ok: false, value: ERR_INVALID_MIN_AGE };
    if (maxAge > 150) return { ok: false, value: ERR_INVALID_MAX_AGE };
    if (this.state.identitiesByOwner.has(this.caller)) {
      return { ok: false, value: ERR_IDENTITY_ALREADY_EXISTS };
    }
    if (this.state.authorityContract === null) {
      return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    }

    this.stxTransfers.push({ amount: this.state.registrationFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextIdentityId;
    const identity: Identity = {
      owner: this.caller,
      hash,
      createdAt: this.blockHeight,
      updatedAt: this.blockHeight,
      status: true,
      identityType,
      expiry,
      location,
      country,
      gender,
      ethnicity,
      religion,
      language,
      education,
      occupation,
      maritalStatus,
      dependents,
      healthStatus,
      disability,
      vaccination,
      minAge,
      maxAge,
    };
    this.state.identities.set(id, identity);
    this.state.identitiesByOwner.set(this.caller, id);
    this.state.nextIdentityId++;
    return { ok: true, value: id };
  }

  getIdentity(id: number): Identity | undefined {
    return this.state.identities.get(id);
  }

  updateIdentityHash(id: number, newHash: Uint8Array, proof: Uint8Array): Result<boolean> {
    const identity = this.state.identities.get(id);
    if (!identity) return { ok: false, value: ERR_IDENTITY_NOT_FOUND };
    if (identity.owner !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newHash.length !== 32) return { ok: false, value: ERR_INVALID_HASH };
    if (proof.length !== 64) return { ok: false, value: ERR_INVALID_PROOF };

    const updated: Identity = {
      ...identity,
      hash: newHash,
      updatedAt: this.blockHeight,
    };
    this.state.identities.set(id, updated);
    this.state.identityUpdates.set(id, {
      updateHash: newHash,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  verifyIdentity(id: number, verifier: string): Result<boolean> {
    const identity = this.state.identities.get(id);
    if (!identity) return { ok: false, value: ERR_IDENTITY_NOT_FOUND };
    if (!this.state.verifierList.includes(verifier)) return { ok: false, value: ERR_INVALID_VERIFIER };
    if (this.caller !== verifier) return { ok: false, value: ERR_NOT_AUTHORIZED };

    const updated: Identity = { ...identity, status: true };
    this.state.identities.set(id, updated);
    return { ok: true, value: true };
  }

  revokeIdentity(id: number, verifier: string): Result<boolean> {
    const identity = this.state.identities.get(id);
    if (!identity) return { ok: false, value: ERR_IDENTITY_NOT_FOUND };
    if (!this.state.verifierList.includes(verifier)) return { ok: false, value: ERR_INVALID_VERIFIER };
    if (this.caller !== verifier) return { ok: false, value: ERR_NOT_AUTHORIZED };

    const updated: Identity = { ...identity, status: false };
    this.state.identities.set(id, updated);
    return { ok: true, value: true };
  }

  getNextIdentityId(): Result<number> {
    return { ok: true, value: this.state.nextIdentityId };
  }

  isIdentityRegistered(owner: string): Result<boolean> {
    return { ok: true, value: this.state.identitiesByOwner.has(owner) };
  }
}

describe("IdentityRegistry", () => {
  let contract: IdentityRegistryMock;

  beforeEach(() => {
    contract = new IdentityRegistryMock();
    contract.reset();
  });

  it("registers an identity successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32);
    const result = contract.registerIdentity(
      hash,
      "refugee",
      100000,
      "CampX",
      "CountryY",
      "male",
      "EthnicZ",
      "ReligionA",
      "LanguageB",
      "EducationC",
      "OccupationD",
      "single",
      2,
      "Healthy",
      false,
      true,
      18,
      60
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const identity = contract.getIdentity(0);
    expect(identity?.owner).toBe("ST1TEST");
    expect(identity?.identityType).toBe("refugee");
    expect(identity?.expiry).toBe(100000);
    expect(identity?.location).toBe("CampX");
    expect(identity?.country).toBe("CountryY");
    expect(identity?.gender).toBe("male");
    expect(identity?.ethnicity).toBe("EthnicZ");
    expect(identity?.religion).toBe("ReligionA");
    expect(identity?.language).toBe("LanguageB");
    expect(identity?.education).toBe("EducationC");
    expect(identity?.occupation).toBe("OccupationD");
    expect(identity?.maritalStatus).toBe("single");
    expect(identity?.dependents).toBe(2);
    expect(identity?.healthStatus).toBe("Healthy");
    expect(identity?.disability).toBe(false);
    expect(identity?.vaccination).toBe(true);
    expect(identity?.minAge).toBe(18);
    expect(identity?.maxAge).toBe(60);
    expect(contract.stxTransfers).toEqual([{ amount: 100, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate identity for owner", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32);
    contract.registerIdentity(
      hash,
      "refugee",
      100000,
      "CampX",
      "CountryY",
      "male",
      "EthnicZ",
      "ReligionA",
      "LanguageB",
      "EducationC",
      "OccupationD",
      "single",
      2,
      "Healthy",
      false,
      true,
      18,
      60
    );
    const result = contract.registerIdentity(
      hash,
      "asylum",
      200000,
      "CampZ",
      "CountryW",
      "female",
      "EthnicV",
      "ReligionU",
      "LanguageT",
      "EducationS",
      "OccupationR",
      "married",
      3,
      "Ill",
      true,
      false,
      25,
      70
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_IDENTITY_ALREADY_EXISTS);
  });

  it("rejects registration without authority contract", () => {
    const hash = new Uint8Array(32);
    const result = contract.registerIdentity(
      hash,
      "refugee",
      100000,
      "CampX",
      "CountryY",
      "male",
      "EthnicZ",
      "ReligionA",
      "LanguageB",
      "EducationC",
      "OccupationD",
      "single",
      2,
      "Healthy",
      false,
      true,
      18,
      60
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid identity type", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32);
    const result = contract.registerIdentity(
      hash,
      "invalid",
      100000,
      "CampX",
      "CountryY",
      "male",
      "EthnicZ",
      "ReligionA",
      "LanguageB",
      "EducationC",
      "OccupationD",
      "single",
      2,
      "Healthy",
      false,
      true,
      18,
      60
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_IDENTITY_TYPE);
  });

  it("updates identity hash successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32);
    contract.registerIdentity(
      hash,
      "refugee",
      100000,
      "CampX",
      "CountryY",
      "male",
      "EthnicZ",
      "ReligionA",
      "LanguageB",
      "EducationC",
      "OccupationD",
      "single",
      2,
      "Healthy",
      false,
      true,
      18,
      60
    );
    const newHash = new Uint8Array(32).fill(1);
    const proof = new Uint8Array(64);
    const result = contract.updateIdentityHash(0, newHash, proof);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const identity = contract.getIdentity(0);
    expect(identity?.hash).toEqual(newHash);
    const update = contract.state.identityUpdates.get(0);
    expect(update?.updateHash).toEqual(newHash);
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent identity", () => {
    const newHash = new Uint8Array(32);
    const proof = new Uint8Array(64);
    const result = contract.updateIdentityHash(99, newHash, proof);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_IDENTITY_NOT_FOUND);
  });

  it("rejects update by non-owner", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32);
    contract.registerIdentity(
      hash,
      "refugee",
      100000,
      "CampX",
      "CountryY",
      "male",
      "EthnicZ",
      "ReligionA",
      "LanguageB",
      "EducationC",
      "OccupationD",
      "single",
      2,
      "Healthy",
      false,
      true,
      18,
      60
    );
    contract.caller = "ST3FAKE";
    const newHash = new Uint8Array(32);
    const proof = new Uint8Array(64);
    const result = contract.updateIdentityHash(0, newHash, proof);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("sets registration fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setRegistrationFee(200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.registrationFee).toBe(200);
    const hash = new Uint8Array(32);
    contract.registerIdentity(
      hash,
      "refugee",
      100000,
      "CampX",
      "CountryY",
      "male",
      "EthnicZ",
      "ReligionA",
      "LanguageB",
      "EducationC",
      "OccupationD",
      "single",
      2,
      "Healthy",
      false,
      true,
      18,
      60
    );
    expect(contract.stxTransfers).toEqual([{ amount: 200, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects registration fee change without authority", () => {
    const result = contract.setRegistrationFee(200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("returns correct next identity id", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32);
    contract.registerIdentity(
      hash,
      "refugee",
      100000,
      "CampX",
      "CountryY",
      "male",
      "EthnicZ",
      "ReligionA",
      "LanguageB",
      "EducationC",
      "OccupationD",
      "single",
      2,
      "Healthy",
      false,
      true,
      18,
      60
    );
    contract.caller = "ST4TEST";
    contract.registerIdentity(
      hash,
      "asylum",
      200000,
      "CampZ",
      "CountryW",
      "female",
      "EthnicV",
      "ReligionU",
      "LanguageT",
      "EducationS",
      "OccupationR",
      "married",
      3,
      "Ill",
      true,
      false,
      25,
      70
    );
    const result = contract.getNextIdentityId();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks identity registration correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32);
    contract.registerIdentity(
      hash,
      "refugee",
      100000,
      "CampX",
      "CountryY",
      "male",
      "EthnicZ",
      "ReligionA",
      "LanguageB",
      "EducationC",
      "OccupationD",
      "single",
      2,
      "Healthy",
      false,
      true,
      18,
      60
    );
    const result = contract.isIdentityRegistered("ST1TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.isIdentityRegistered("ST3FAKE");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("rejects registration with invalid hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(31);
    const result = contract.registerIdentity(
      hash,
      "refugee",
      100000,
      "CampX",
      "CountryY",
      "male",
      "EthnicZ",
      "ReligionA",
      "LanguageB",
      "EducationC",
      "OccupationD",
      "single",
      2,
      "Healthy",
      false,
      true,
      18,
      60
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_HASH);
  });

  it("rejects registration with max identities exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxIdentities = 1;
    const hash = new Uint8Array(32);
    contract.registerIdentity(
      hash,
      "refugee",
      100000,
      "CampX",
      "CountryY",
      "male",
      "EthnicZ",
      "ReligionA",
      "LanguageB",
      "EducationC",
      "OccupationD",
      "single",
      2,
      "Healthy",
      false,
      true,
      18,
      60
    );
    const result = contract.registerIdentity(
      hash,
      "asylum",
      200000,
      "CampZ",
      "CountryW",
      "female",
      "EthnicV",
      "ReligionU",
      "LanguageT",
      "EducationS",
      "OccupationR",
      "married",
      3,
      "Ill",
      true,
      false,
      25,
      70
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_IDENTITIES_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("adds verifier successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2TEST";
    const result = contract.addVerifier("ST3VERIFIER");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.verifierList).toContain("ST3VERIFIER");
  });

  it("rejects adding duplicate verifier", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2TEST";
    contract.addVerifier("ST3VERIFIER");
    const result = contract.addVerifier("ST3VERIFIER");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_VERIFIER);
  });

  it("removes verifier successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2TEST";
    contract.addVerifier("ST3VERIFIER");
    const result = contract.removeVerifier("ST3VERIFIER");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.verifierList).not.toContain("ST3VERIFIER");
  });

  it("verifies identity successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2TEST";
    contract.addVerifier("ST3VERIFIER");
    contract.caller = "ST1TEST";
    const hash = new Uint8Array(32);
    contract.registerIdentity(
      hash,
      "refugee",
      100000,
      "CampX",
      "CountryY",
      "male",
      "EthnicZ",
      "ReligionA",
      "LanguageB",
      "EducationC",
      "OccupationD",
      "single",
      2,
      "Healthy",
      false,
      true,
      18,
      60
    );
    contract.caller = "ST3VERIFIER";
    const result = contract.verifyIdentity(0, "ST3VERIFIER");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const identity = contract.getIdentity(0);
    expect(identity?.status).toBe(true);
  });

  it("revokes identity successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2TEST";
    contract.addVerifier("ST3VERIFIER");
    contract.caller = "ST1TEST";
    const hash = new Uint8Array(32);
    contract.registerIdentity(
      hash,
      "refugee",
      100000,
      "CampX",
      "CountryY",
      "male",
      "EthnicZ",
      "ReligionA",
      "LanguageB",
      "EducationC",
      "OccupationD",
      "single",
      2,
      "Healthy",
      false,
      true,
      18,
      60
    );
    contract.caller = "ST3VERIFIER";
    const result = contract.revokeIdentity(0, "ST3VERIFIER");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const identity = contract.getIdentity(0);
    expect(identity?.status).toBe(false);
  });
});