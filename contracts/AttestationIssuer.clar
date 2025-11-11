;; contracts/AttestationIssuer.clar

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ISSUER-NOT-WHITELISTED u101)
(define-constant ERR-INVALID-SCHEMA u102)
(define-constant ERR-INVALID-DATA-HASH u103)
(define-constant ERR-INVALID-EXPIRY u104)
(define-constant ERR-ATTESTATION-ALREADY-EXISTS u105)
(define-constant ERR-ATTESTATION-NOT-FOUND u106)
(define-constant ERR-INVALID-IDENTITY-ID u107)
(define-constant ERR-MAX-ATTESTATIONS-EXCEEDED u108)
(define-constant ERR-INVALID-REVOCATION-REASON u109)
(define-constant ERR-ALREADY-REVOKED u110)
(define-constant ERR-INVALID-SCHEMA-VERSION u111)
(define-constant ERR-INVALID-ISSUER-FEE u112)
(define-constant ERR-INVALID-MAX-SCHEMAS u113)
(define-constant ERR-SCHEMA-ALREADY-EXISTS u114)
(define-constant ERR-SCHEMA-NOT-FOUND u115)
(define-constant ERR-INVALID-SCHEMA-NAME u116)
(define-constant ERR-INVALID-WHITELIST-UPDATE u117)

(define-data-var next-attestation-id uint u0)
(define-data-var max-attestations uint u5000)
(define-data-var issuer-fee uint u500)
(define-data-var admin-principal principal tx-sender)
(define-data-var contract-uri (string-ascii 256) "")

(define-map issuers 
  principal 
  { 
    whitelisted: bool, 
    fee-exempt: bool, 
    max-attestations-per-identity: uint,
    created-at: uint 
  }
)

(define-map schemas
  (string-utf8 64)
  { 
    version: uint, 
    description: (string-utf8 128), 
    fields: (list 10 (string-utf8 32)), 
    active: bool,
    created-at: uint 
  }
)

(define-map attestations
  uint
  { 
    identity-id: uint,
    schema: (string-utf8 64),
    data-hash: (buff 32),
    issuer: principal,
    expiry: (optional uint),
    revoked: bool,
    revocation-reason: (optional (string-utf8 64)),
    timestamp: uint,
    version: uint 
  }
)

(define-map identity-attestation-count
  uint
  uint
)

(define-map schema-attestation-count
  (string-utf8 64)
  uint
)

(define-map issuer-attestation-count
  principal
  uint
)

(define-read-only (get-attestation (id uint))
  (map-get? attestations id)
)

(define-read-only (get-issuer-status (issuer principal))
  (map-get? issuers issuer)
)

(define-read-only (get-schema (schema-name (string-utf8 64)))
  (map-get? schemas schema-name)
)

(define-read-only (get-attestation-count-for-identity (identity-id uint))
  (map-get? identity-attestation-count identity-id)
)

(define-read-only (get-next-attestation-id)
  (var-get next-attestation-id)
)

(define-read-only (get-max-attestations)
  (var-get max-attestations)
)

(define-read-only (get-issuer-fee)
  (var-get issuer-fee)
)

(define-read-only (get-admin)
  (var-get admin-principal)
)

(define-read-only (get-contract-uri)
  (var-get contract-uri)
)

(define-private (validate-schema-name (name (string-utf8 64)))
  (if (and (> (len name) u0) (<= (len name) u64))
      (ok true)
      (err ERR-INVALID-SCHEMA-NAME))
)

(define-private (validate-schema-version (version uint))
  (if (> version u0)
      (ok true)
      (err ERR-INVALID-SCHEMA-VERSION))
)

(define-private (validate-schema-description (desc (string-utf8 128)))
  (if (<= (len desc) u128)
      (ok true)
      (err ERR-INVALID-SCHEMA-NAME))
)

(define-private (validate-fields (fields (list 10 (string-utf8 32))))
  (if (<= (len fields) u10)
      (ok true)
      (err ERR-INVALID-SCHEMA-NAME))
)

(define-private (validate-data-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-DATA-HASH))
)

(define-private (validate-expiry (expiry (optional uint)))
  (match expiry exp 
    (if (>= exp block-height)
        (ok true)
        (err ERR-INVALID-EXPIRY))
    (ok true))
)

(define-private (validate-revocation-reason (reason (optional (string-utf8 64))))
  (match reason r 
    (if (<= (len r) u64)
        (ok true)
        (err ERR-INVALID-REVOCATION-REASON))
    (ok true))
)

(define-private (validate-identity-id (id uint))
  (if (> id u0)
      (ok true)
      (err ERR-INVALID-IDENTITY-ID))
)

(define-private (is-admin)
  (is-eq tx-sender (var-get admin-principal))
)

(define-private (is-whitelisted-issuer (issuer principal))
  (match (map-get? issuers issuer)
    data (get whitelisted data)
    false)
)

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set admin-principal new-admin)
    (ok true)
  )
)

(define-public (set-max-attestations (new-max uint))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (> new-max u0) (err ERR-INVALID-MAX-SCHEMAS))
    (var-set max-attestations new-max)
    (ok true)
  )
)

(define-public (set-issuer-fee (new-fee uint))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (>= new-fee u0) (err ERR-INVALID-ISSUER-FEE))
    (var-set issuer-fee new-fee)
    (ok true)
  )
)

(define-public (set-contract-uri (uri (string-ascii 256)))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (<= (len uri) u256) (err ERR-NOT-AUTHORIZED))
    (var-set contract-uri uri)
    (ok true)
  )
)

(define-public (whitelist-issuer (issuer principal) (fee-exempt bool) (max-per-identity uint))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (> max-per-identity u0) (err ERR-INVALID-WHITELIST-UPDATE))
    (map-set issuers issuer
      {
        whitelisted: true,
        fee-exempt: fee-exempt,
        max-attestations-per-identity: max-per-identity,
        created-at: block-height
      }
    )
    (ok true)
  )
)

(define-public (update-issuer-limit (issuer principal) (new-limit uint))
  (let ((issuer-data (map-get? issuers issuer)))
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (> new-limit u0) (err ERR-INVALID-WHITELIST-UPDATE))
    (match issuer-data
      data
        (begin
          (map-set issuers issuer
            (merge data { max-attestations-per-identity: new-limit })
          )
          (ok true)
        )
      (err ERR-ISSUER-NOT-WHITELISTED))
  )
)

(define-public (dewhitelist-issuer (issuer principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (map-delete issuers issuer)
    (ok true)
  )
)

(define-public (create-schema 
  (schema-name (string-utf8 64))
  (version uint)
  (description (string-utf8 128))
  (fields (list 10 (string-utf8 32)))
)
  (begin
    (asserts! (or (is-admin) (is-whitelisted-issuer tx-sender)) (err ERR-NOT-AUTHORIZED))
    (try! (validate-schema-name schema-name))
    (try! (validate-schema-version version))
    (try! (validate-schema-description description))
    (try! (validate-fields fields))
    (asserts! (is-none (map-get? schemas schema-name)) (err ERR-SCHEMA-ALREADY-EXISTS))
    (map-set schemas schema-name
      {
        version: version,
        description: description,
        fields: fields,
        active: true,
        created-at: block-height
      }
    )
    (ok true)
  )
)

(define-public (update-schema 
  (schema-name (string-utf8 64))
  (new-version uint)
  (new-description (optional (string-utf8 128)))
  (new-fields (optional (list 10 (string-utf8 32))))
  (active bool)
)
  (let ((schema-data (unwrap! (map-get? schemas schema-name) (err ERR-SCHEMA-NOT-FOUND))))
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (try! (validate-schema-version new-version))
    (match new-description desc (try! (validate-schema-description desc)))
    (match new-fields fls (try! (validate-fields fls)))
    (map-set schemas schema-name
      (merge schema-data
        {
          version: new-version,
          description: (default-to (get description schema-data) new-description),
          fields: (default-to (get fields schema-data) new-fields),
          active: active
        }
      )
    )
    (ok true)
  )
)

(define-public (issue-attestation 
  (identity-id uint)
  (schema (string-utf8 64))
  (data-hash (buff 32))
  (expiry (optional uint))
)
  (let (
        (next-id (var-get next-attestation-id))
        (current-max (var-get max-attestations))
        (issuer tx-sender)
        (count-per-identity (default-to u0 (map-get? identity-attestation-count identity-id)))
        (schema-data (unwrap! (map-get? schemas schema) (err ERR-INVALID-SCHEMA)))
        (issuer-data (unwrap! (map-get? issuers issuer) (err ERR-ISSUER-NOT-WHITELISTED)))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-ATTESTATIONS-EXCEEDED))
    (try! (validate-identity-id identity-id))
    (try! (validate-data-hash data-hash))
    (try! (validate-expiry expiry))
    (asserts! (get active schema-data) (err ERR-INVALID-SCHEMA))
    (asserts! (get whitelisted issuer-data) (err ERR-ISSUER-NOT-WHITELISTED))
    (asserts! (<= count-per-identity (get max-attestations-per-identity issuer-data)) (err ERR-INVALID-WHITELIST-UPDATE))
    (asserts! (is-none (map-get? attestations next-id)) (err ERR-ATTESTATION-ALREADY-EXISTS))
    (let (
          (fee (if (get fee-exempt issuer-data) u0 (var-get issuer-fee)))
          (admin (var-get admin-principal))
        )
      (if (> fee u0)
          (try! (stx-transfer? fee tx-sender admin))
          (ok true)
      )
      (map-set attestations next-id
        {
          identity-id: identity-id,
          schema: schema,
          data-hash: data-hash,
          issuer: issuer,
          expiry: expiry,
          revoked: false,
          revocation-reason: none,
          timestamp: block-height,
          version: (get version schema-data)
        }
      )
      (map-set identity-attestation-count identity-id (+ count-per-identity u1))
      (map-set schema-attestation-count schema 
        (+ u1 (default-to u0 (map-get? schema-attestation-count schema)))
      )
      (map-set issuer-attestation-count issuer 
        (+ u1 (default-to u0 (map-get? issuer-attestation-count issuer)))
      )
      (var-set next-attestation-id (+ next-id u1))
      (print { event: "attestation-issued", id: next-id })
      (ok next-id)
    )
  )
)

(define-public (revoke-attestation (attestation-id uint) (reason (optional (string-utf8 64))))
  (let (
        (att-data (unwrap! (map-get? attestations attestation-id) (err ERR-ATTESTATION-NOT-FOUND)))
        (issuer (get issuer att-data))
      )
    (asserts! (or (is-eq tx-sender issuer) (is-admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (get revoked att-data)) (err ERR-ALREADY-REVOKED))
    (try! (validate-revocation-reason reason))
    (map-set attestations attestation-id
      (merge att-data
        {
          revoked: true,
          revocation-reason: reason
        }
      )
    )
    (print { event: "attestation-revoked", id: attestation-id })
    (ok true)
  )
)

(define-public (get-attestations-by-identity (identity-id uint))
  (ok {
    count: (default-to u0 (map-get? identity-attestation-count identity-id)),
    next-id: (var-get next-attestation-id)
  })
)

(define-public (get-attestations-by-schema (schema (string-utf8 64)))
  (ok (default-to u0 (map-get? schema-attestation-count schema)))
)

(define-public (get-attestations-by-issuer (issuer principal))
  (ok (default-to u0 (map-get? issuer-attestation-count issuer)))
)