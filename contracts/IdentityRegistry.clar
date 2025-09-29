;; contracts/IdentityRegistry.clar

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-HASH u101)
(define-constant ERR-INVALID-ID u102)
(define-constant ERR-INVALID-STATUS u103)
(define-constant ERR-INVALID-TIMESTAMP u104)
(define-constant ERR-INVALID-VERIFIER u105)
(define-constant ERR-IDENTITY-ALREADY-EXISTS u106)
(define-constant ERR-IDENTITY-NOT-FOUND u107)
(define-constant ERR-INVALID-PROOF u108)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u109)
(define-constant ERR-INVALID-MIN-AGE u110)
(define-constant ERR-INVALID-MAX-AGE u111)
(define-constant ERR-UPDATE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-IDENTITIES-EXCEEDED u114)
(define-constant ERR-INVALID-IDENTITY-TYPE u115)
(define-constant ERR-INVALID-EXPIRY u116)
(define-constant ERR-INVALID-LOCATION u117)
(define-constant ERR-INVALID-COUNTRY u118)
(define-constant ERR-INVALID-GENDER u119)
(define-constant ERR-INVALID-ETHNICITY u120)
(define-constant ERR-INVALID-RELIGION u121)
(define-constant ERR-INVALID-LANGUAGE u122)
(define-constant ERR-INVALID-EDUCATION u123)
(define-constant ERR-INVALID-OCCUPATION u124)
(define-constant ERR-INVALID-MARITAL-STATUS u125)
(define-constant ERR-INVALID-DEPENDENTS u126)
(define-constant ERR-INVALID-HEALTH-STATUS u127)
(define-constant ERR-INVALID-DISABILITY u128)
(define-constant ERR-INVALID-VACCINATION u129)
(define-constant ERR-INVALID-REGISTRATION-FEE u130)

(define-data-var next-identity-id uint u0)
(define-data-var max-identities uint u1000000)
(define-data-var registration-fee uint u100)
(define-data-var authority-contract (optional principal) none)
(define-data-var verifier-list (list 100 principal) (list))

(define-non-fungible-token identity-nft uint)

(define-map identities
  uint
  {
    owner: principal,
    hash: (buff 32),
    created-at: uint,
    updated-at: uint,
    status: bool,
    identity-type: (string-utf8 50),
    expiry: uint,
    location: (string-utf8 100),
    country: (string-utf8 50),
    gender: (string-utf8 20),
    ethnicity: (string-utf8 50),
    religion: (string-utf8 50),
    language: (string-utf8 50),
    education: (string-utf8 50),
    occupation: (string-utf8 50),
    marital-status: (string-utf8 20),
    dependents: uint,
    health-status: (string-utf8 50),
    disability: bool,
    vaccination: bool,
    min-age: uint,
    max-age: uint
  }
)

(define-map identities-by-owner
  principal
  uint)

(define-map identity-updates
  uint
  {
    update-hash: (buff 32),
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-identity (id uint))
  (map-get? identities id)
)

(define-read-only (get-identity-updates (id uint))
  (map-get? identity-updates id)
)

(define-read-only (is-identity-registered (owner principal))
  (is-some (map-get? identities-by-owner owner))
)

(define-read-only (get-owner-identity-id (owner principal))
  (map-get? identities-by-owner owner)
)

(define-read-only (get-next-identity-id)
  (var-get next-identity-id)
)

(define-read-only (get-max-identities)
  (var-get max-identities)
)

(define-read-only (get-registration-fee)
  (var-get registration-fee)
)

(define-read-only (get-authority-contract)
  (var-get authority-contract)
)

(define-read-only (is-verifier (p principal))
  (is-some (index-of? (var-get verifier-list) p))
)

(define-private (validate-hash (h (buff 32)))
  (if (is-eq (len h) u32)
      (ok true)
      (err ERR-INVALID-HASH))
)

(define-private (validate-status (s bool))
  (ok true)
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-identity-type (t (string-utf8 50)))
  (if (or (is-eq t "refugee") (is-eq t "asylum") (is-eq t "displaced"))
      (ok true)
      (err ERR-INVALID-IDENTITY-TYPE))
)

(define-private (validate-expiry (e uint))
  (if (> e block-height)
      (ok true)
      (err ERR-INVALID-EXPIRY))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-country (c (string-utf8 50)))
  (if (and (> (len c) u0) (<= (len c) u50))
      (ok true)
      (err ERR-INVALID-COUNTRY))
)

(define-private (validate-gender (g (string-utf8 20)))
  (if (or (is-eq g "male") (is-eq g "female") (is-eq g "other"))
      (ok true)
      (err ERR-INVALID-GENDER))
)

(define-private (validate-ethnicity (e (string-utf8 50)))
  (if (<= (len e) u50)
      (ok true)
      (err ERR-INVALID-ETHNICITY))
)

(define-private (validate-religion (r (string-utf8 50)))
  (if (<= (len r) u50)
      (ok true)
      (err ERR-INVALID-RELIGION))
)

(define-private (validate-language (l (string-utf8 50)))
  (if (<= (len l) u50)
      (ok true)
      (err ERR-INVALID-LANGUAGE))
)

(define-private (validate-education (ed (string-utf8 50)))
  (if (<= (len ed) u50)
      (ok true)
      (err ERR-INVALID-EDUCATION))
)

(define-private (validate-occupation (o (string-utf8 50)))
  (if (<= (len o) u50)
      (ok true)
      (err ERR-INVALID-OCCUPATION))
)

(define-private (validate-marital-status (m (string-utf8 20)))
  (if (or (is-eq m "single") (is-eq m "married") (is-eq m "divorced"))
      (ok true)
      (err ERR-INVALID-MARITAL-STATUS))
)

(define-private (validate-dependents (d uint))
  (if (<= d u20)
      (ok true)
      (err ERR-INVALID-DEPENDENTS))
)

(define-private (validate-health-status (h (string-utf8 50)))
  (if (<= (len h) u50)
      (ok true)
      (err ERR-INVALID-HEALTH-STATUS))
)

(define-private (validate-disability (dis bool))
  (ok true)
)

(define-private (validate-vaccination (v bool))
  (ok true)
)

(define-private (validate-min-age (min uint))
  (if (<= min u100)
      (ok true)
      (err ERR-INVALID-MIN-AGE))
)

(define-private (validate-max-age (max uint))
  (if (<= max u150)
      (ok true)
      (err ERR-INVALID-MAX-AGE))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-private (validate-proof (proof (buff 64)))
  (if (is-eq (len proof) u64)
      (ok true)
      (err ERR-INVALID-PROOF))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-identities (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-identities new-max)
    (ok true)
  )
)

(define-public (set-registration-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-REGISTRATION-FEE))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set registration-fee new-fee)
    (ok true)
  )
)

(define-public (add-verifier (verifier principal))
  (begin
    (asserts! (is-eq tx-sender (unwrap! (var-get authority-contract) (err ERR-AUTHORITY-NOT-VERIFIED))) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-verifier verifier)) (err ERR-INVALID-VERIFIER))
    (var-set verifier-list (append (var-get verifier-list) verifier))
    (ok true)
  )
)

(define-public (remove-verifier (verifier principal))
  (begin
    (asserts! (is-eq tx-sender (unwrap! (var-get authority-contract) (err ERR-AUTHORITY-NOT-VERIFIED))) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-verifier verifier) (err ERR-INVALID-VERIFIER))
    (var-set verifier-list (filter not-eq-verifier (var-get verifier-list)))
    (ok true)
  )
)

(define-private (not-eq-verifier (p principal))
  (not (is-eq p verifier))
)

(define-public (register-identity
  (hash (buff 32))
  (identity-type (string-utf8 50))
  (expiry uint)
  (location (string-utf8 100))
  (country (string-utf8 50))
  (gender (string-utf8 20))
  (ethnicity (string-utf8 50))
  (religion (string-utf8 50))
  (language (string-utf8 50))
  (education (string-utf8 50))
  (occupation (string-utf8 50))
  (marital-status (string-utf8 20))
  (dependents uint)
  (health-status (string-utf8 50))
  (disability bool)
  (vaccination bool)
  (min-age uint)
  (max-age uint)
)
  (let (
        (next-id (var-get next-identity-id))
        (current-max (var-get max-identities))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-IDENTITIES-EXCEEDED))
    (try! (validate-hash hash))
    (try! (validate-identity-type identity-type))
    (try! (validate-expiry expiry))
    (try! (validate-location location))
    (try! (validate-country country))
    (try! (validate-gender gender))
    (try! (validate-ethnicity ethnicity))
    (try! (validate-religion religion))
    (try! (validate-language language))
    (try! (validate-education education))
    (try! (validate-occupation occupation))
    (try! (validate-marital-status marital-status))
    (try! (validate-dependents dependents))
    (try! (validate-health-status health-status))
    (try! (validate-disability disability))
    (try! (validate-vaccination vaccination))
    (try! (validate-min-age min-age))
    (try! (validate-max-age max-age))
    (asserts! (not (is-identity-registered tx-sender)) (err ERR-IDENTITY-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get registration-fee) tx-sender authority-recipient))
    )
    (try! (nft-mint? identity-nft next-id tx-sender))
    (map-set identities next-id
      {
        owner: tx-sender,
        hash: hash,
        created-at: block-height,
        updated-at: block-height,
        status: true,
        identity-type: identity-type,
        expiry: expiry,
        location: location,
        country: country,
        gender: gender,
        ethnicity: ethnicity,
        religion: religion,
        language: language,
        education: education,
        occupation: occupation,
        marital-status: marital-status,
        dependents: dependents,
        health-status: health-status,
        disability: disability,
        vaccination: vaccination,
        min-age: min-age,
        max-age: max-age
      }
    )
    (map-set identities-by-owner tx-sender next-id)
    (var-set next-identity-id (+ next-id u1))
    (print { event: "identity-registered", id: next-id })
    (ok next-id)
  )
)

(define-public (update-identity-hash
  (id uint)
  (new-hash (buff 32))
  (proof (buff 64))
)
  (let ((identity (map-get? identities id)))
    (match identity
      i
        (begin
          (asserts! (is-eq (get owner i) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-hash new-hash))
          (try! (validate-proof proof))
          (map-set identities id
            (merge i { hash: new-hash, updated-at: block-height })
          )
          (map-set identity-updates id
            {
              update-hash: new-hash,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "identity-updated", id: id })
          (ok true)
        )
      (err ERR-IDENTITY-NOT-FOUND)
    )
  )
)

(define-public (verify-identity (id uint) (verifier principal))
  (let ((identity (map-get? identities id)))
    (match identity
      i
        (begin
          (asserts! (is-verifier verifier) (err ERR-INVALID-VERIFIER))
          (asserts! (is-eq tx-sender verifier) (err ERR-NOT-AUTHORIZED))
          (map-set identities id
            (merge i { status: true })
          )
          (ok true)
        )
      (err ERR-IDENTITY-NOT-FOUND)
    )
  )
)

(define-public (revoke-identity (id uint) (verifier principal))
  (let ((identity (map-get? identities id)))
    (match identity
      i
        (begin
          (asserts! (is-verifier verifier) (err ERR-INVALID-VERIFIER))
          (asserts! (is-eq tx-sender verifier) (err ERR-NOT-AUTHORIZED))
          (map-set identities id
            (merge i { status: false })
          )
          (ok true)
        )
      (err ERR-IDENTITY-NOT-FOUND)
    )
  )
)

(define-public (transfer (id uint) (sender principal) (recipient principal))
  (err ERR-NOT-AUTHORIZED)
)