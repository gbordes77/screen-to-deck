# API Specification - MTG Screen-to-Deck v2.1.0

## OpenAPI Specification

```yaml
openapi: 3.0.3
info:
  title: MTG Screen-to-Deck API
  description: |
    RESTful API for converting Magic: The Gathering deck screenshots to validated card lists.
    Guarantees extraction of 60 mainboard + 15 sideboard cards with intelligent validation.
  version: 2.1.0
  contact:
    name: API Support
    email: api@screentodeck.com
    url: https://docs.screentodeck.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.screentodeck.com/v2
    description: Production server
  - url: https://staging-api.screentodeck.com/v2
    description: Staging server
  - url: http://localhost:3001/api
    description: Development server

tags:
  - name: OCR
    description: Optical Character Recognition operations
  - name: Cards
    description: Card validation and search operations
  - name: Export
    description: Deck export operations
  - name: Health
    description: Service health and monitoring
```

## Authentication

```yaml
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key for authenticated requests (optional for basic usage)
    
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT token for premium features

security:
  - ApiKeyAuth: []
  - BearerAuth: []
  - {}  # Anonymous access allowed for basic operations
```

## Core Endpoints

### OCR Operations

#### POST /api/ocr/upload

```yaml
paths:
  /api/ocr/upload:
    post:
      tags:
        - OCR
      summary: Process deck screenshot with OCR
      description: |
        Uploads an image for OCR processing to extract Magic: The Gathering cards.
        Returns a job ID for tracking the asynchronous processing.
      operationId: createOcrJob
      
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - image
              properties:
                image:
                  type: string
                  format: binary
                  description: Image file (PNG, JPG, WebP, GIF)
                  maxLength: 10485760  # 10MB
                options:
                  type: object
                  properties:
                    format:
                      type: string
                      enum: [auto, mtga, mtgo]
                      default: auto
                      description: Deck format for specialized parsing
                    enhance:
                      type: boolean
                      default: true
                      description: Apply image enhancement preprocessing
                    language:
                      type: string
                      enum: [en, fr, es, de, it, ja, pt, ru]
                      default: en
                      description: Card language for better recognition
                    priority:
                      type: string
                      enum: [low, normal, high]
                      default: normal
                      description: Processing priority (premium feature)
      
      responses:
        '202':
          description: OCR job created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  processId:
                    type: string
                    format: uuid
                    example: "550e8400-e29b-41d4-a716-446655440000"
                  status:
                    type: string
                    enum: [queued, processing]
                    example: processing
                  estimatedTime:
                    type: integer
                    description: Estimated processing time in seconds
                    example: 5
                  queuePosition:
                    type: integer
                    description: Position in processing queue
                    example: 1
                  message:
                    type: string
                    example: "OCR job created successfully"
        
        '400':
          $ref: '#/components/responses/BadRequest'
        '413':
          $ref: '#/components/responses/PayloadTooLarge'
        '429':
          $ref: '#/components/responses/TooManyRequests'
        '500':
          $ref: '#/components/responses/InternalServerError'
```

#### GET /api/ocr/status/{processId}

```yaml
  /api/ocr/status/{processId}:
    get:
      tags:
        - OCR
      summary: Get OCR job status and results
      description: |
        Retrieves the current status of an OCR job and returns results when completed.
        Implements long-polling for real-time updates.
      operationId: getOcrStatus
      
      parameters:
        - name: processId
          in: path
          required: true
          schema:
            type: string
            format: uuid
          description: The OCR job ID
        - name: wait
          in: query
          schema:
            type: boolean
            default: false
          description: Enable long-polling to wait for completion
        - name: timeout
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 30
            default: 10
          description: Long-polling timeout in seconds
      
      responses:
        '200':
          description: Job status retrieved successfully
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: '#/components/schemas/OcrProcessing'
                  - $ref: '#/components/schemas/OcrCompleted'
                  - $ref: '#/components/schemas/OcrFailed'
              examples:
                processing:
                  value:
                    processId: "550e8400-e29b-41d4-a716-446655440000"
                    status: "processing"
                    progress: 65
                    currentStep: "Validating cards with Scryfall"
                    startedAt: "2025-01-08T10:30:00Z"
                completed:
                  value:
                    processId: "550e8400-e29b-41d4-a716-446655440000"
                    status: "completed"
                    result:
                      mainboard:
                        count: 60
                        cards:
                          - name: "Lightning Bolt"
                            quantity: 4
                            validated: true
                            set: "STA"
                            collectorNumber: "42"
                            scryfallId: "abc123"
                      sideboard:
                        count: 15
                        cards:
                          - name: "Rest in Peace"
                            quantity: 3
                            validated: true
                      metadata:
                        processingTime: 3.2
                        confidence: 0.95
                        corrections: 2
                        language: "en"
                    completedAt: "2025-01-08T10:30:03Z"
        
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'
```

### Card Operations

#### POST /api/cards/validate

```yaml
  /api/cards/validate:
    post:
      tags:
        - Cards
      summary: Validate and correct card names
      description: |
        Validates a list of card names against the Scryfall database.
        Provides fuzzy matching and automatic correction for typos.
      operationId: validateCards
      
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - cards
              properties:
                cards:
                  type: array
                  items:
                    type: string
                  minItems: 1
                  maxItems: 200
                  example: ["Lightming Bolt", "Countersplel", "Thoughtseize"]
                options:
                  type: object
                  properties:
                    fuzzyMatch:
                      type: boolean
                      default: true
                      description: Enable fuzzy matching for typos
                    autoCorrect:
                      type: boolean
                      default: true
                      description: Automatically correct card names
                    threshold:
                      type: number
                      minimum: 0
                      maximum: 1
                      default: 0.8
                      description: Similarity threshold for matching
                    format:
                      type: string
                      enum: [standard, pioneer, modern, legacy, vintage, commander]
                      description: Validate cards for specific format
                    includeDetails:
                      type: boolean
                      default: false
                      description: Include full card details in response
      
      responses:
        '200':
          description: Validation completed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  validated:
                    type: array
                    items:
                      type: object
                      properties:
                        input:
                          type: string
                          example: "Lightming Bolt"
                        corrected:
                          type: string
                          example: "Lightning Bolt"
                        valid:
                          type: boolean
                          example: true
                        confidence:
                          type: number
                          minimum: 0
                          maximum: 1
                          example: 0.92
                        scryfallId:
                          type: string
                          example: "e3285e6b-3e79-4d7c-bf96-d920f973b122"
                        details:
                          $ref: '#/components/schemas/CardDetails'
                  invalid:
                    type: array
                    items:
                      type: string
                    example: ["Unknown Card Name", "Not A Real Card"]
                  statistics:
                    type: object
                    properties:
                      total:
                        type: integer
                        example: 75
                      valid:
                        type: integer
                        example: 73
                      corrected:
                        type: integer
                        example: 5
                      invalid:
                        type: integer
                        example: 2
        
        '400':
          $ref: '#/components/responses/BadRequest'
        '429':
          $ref: '#/components/responses/TooManyRequests'
```

#### GET /api/cards/search

```yaml
  /api/cards/search:
    get:
      tags:
        - Cards
      summary: Search for Magic cards
      description: |
        Search for cards using various criteria with Scryfall integration.
        Supports fuzzy matching and advanced query syntax.
      operationId: searchCards
      
      parameters:
        - name: q
          in: query
          required: true
          schema:
            type: string
            minLength: 2
          description: Search query (card name or Scryfall syntax)
          example: "lightning"
        - name: fuzzy
          in: query
          schema:
            type: boolean
            default: false
          description: Enable fuzzy name matching
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
          description: Maximum results to return
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
          description: Page number for pagination
        - name: sort
          in: query
          schema:
            type: string
            enum: [name, released, set, rarity, usd, eur, cmc]
            default: name
          description: Sort order for results
        - name: direction
          in: query
          schema:
            type: string
            enum: [asc, desc]
            default: asc
          description: Sort direction
        - name: includeExtras
          in: query
          schema:
            type: boolean
            default: false
          description: Include tokens and other extras
        - name: unique
          in: query
          schema:
            type: string
            enum: [cards, art, prints]
            default: cards
          description: Unique mode for results
      
      responses:
        '200':
          description: Search completed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  results:
                    type: array
                    items:
                      $ref: '#/components/schemas/CardDetails'
                  totalResults:
                    type: integer
                    example: 42
                  hasMore:
                    type: boolean
                    example: true
                  nextPage:
                    type: string
                    format: uri
                    example: "/api/cards/search?q=lightning&page=2"
        
        '400':
          $ref: '#/components/responses/BadRequest'
        '429':
          $ref: '#/components/responses/TooManyRequests'
```

#### GET /api/cards/{scryfallId}

```yaml
  /api/cards/{scryfallId}:
    get:
      tags:
        - Cards
      summary: Get card details by Scryfall ID
      description: Retrieves detailed information about a specific card
      operationId: getCardById
      
      parameters:
        - name: scryfallId
          in: path
          required: true
          schema:
            type: string
            format: uuid
          description: Scryfall card ID
      
      responses:
        '200':
          description: Card details retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CardDetails'
        
        '404':
          $ref: '#/components/responses/NotFound'
```

### Export Operations

#### POST /api/export/{format}

```yaml
  /api/export/{format}:
    post:
      tags:
        - Export
      summary: Export deck in specified format
      description: |
        Exports a deck list in various formats for different platforms.
        Supports MTGA, Moxfield, Archidekt, and more.
      operationId: exportDeck
      
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - deck
                - format
              properties:
                deck:
                  type: object
                  required:
                    - mainboard
                  properties:
                    name:
                      type: string
                      example: "Lightning Aggro"
                    mainboard:
                      type: array
                      items:
                        type: object
                        required:
                          - name
                          - quantity
                        properties:
                          name:
                            type: string
                            example: "Lightning Bolt"
                          quantity:
                            type: integer
                            minimum: 1
                            maximum: 4
                            example: 4
                          set:
                            type: string
                            example: "STA"
                          collectorNumber:
                            type: string
                            example: "42"
                    sideboard:
                      type: array
                      items:
                        type: object
                        properties:
                          name:
                            type: string
                          quantity:
                            type: integer
                    commander:
                      type: string
                      description: Commander for EDH decks
                format:
                  type: string
                  enum: [mtga, moxfield, archidekt, tappedout, cockatrice, json, csv, txt]
                  description: Export format
                options:
                  type: object
                  properties:
                    includeSetCodes:
                      type: boolean
                      default: true
                      description: Include set codes in export
                    includePrices:
                      type: boolean
                      default: false
                      description: Include card prices
                    includeImages:
                      type: boolean
                      default: false
                      description: Include image URLs
                    groupByType:
                      type: boolean
                      default: false
                      description: Group cards by type
                    sortAlphabetically:
                      type: boolean
                      default: true
                      description: Sort cards alphabetically
                    language:
                      type: string
                      enum: [en, fr, es, de, it, ja, pt, ru]
                      default: en
      
      responses:
        '200':
          description: Deck exported successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  format:
                    type: string
                    example: "mtga"
                  content:
                    type: string
                    description: Exported deck content
                    example: "4 Lightning Bolt (STA) 42\n2 Counterspell (MH2) 267"
                  filename:
                    type: string
                    example: "lightning_aggro.txt"
                  mimeType:
                    type: string
                    example: "text/plain"
                  statistics:
                    type: object
                    properties:
                      mainboardCount:
                        type: integer
                        example: 60
                      sideboardCount:
                        type: integer
                        example: 15
                      uniqueCards:
                        type: integer
                        example: 32
                      estimatedPrice:
                        type: object
                        properties:
                          usd:
                            type: number
                            example: 250.50
                          eur:
                            type: number
                            example: 220.00
                  downloadUrl:
                    type: string
                    format: uri
                    description: Temporary download URL (expires in 1 hour)
                    example: "https://api.screentodeck.com/download/abc123"
            
            text/plain:
              schema:
                type: string
                description: Direct text export for MTGA format
        
        '400':
          $ref: '#/components/responses/BadRequest'
```

#### GET /api/export/formats

```yaml
  /api/export/formats:
    get:
      tags:
        - Export
      summary: Get available export formats
      description: Returns list of all supported export formats with details
      operationId: getExportFormats
      
      responses:
        '200':
          description: Export formats retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  formats:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          example: "mtga"
                        name:
                          type: string
                          example: "MTG Arena"
                        description:
                          type: string
                          example: "Export format for MTG Arena with set codes"
                        extension:
                          type: string
                          example: ".txt"
                        mimeType:
                          type: string
                          example: "text/plain"
                        supportsOptions:
                          type: array
                          items:
                            type: string
                          example: ["includeSetCodes", "sortAlphabetically"]
                        example:
                          type: string
                          example: "4 Lightning Bolt (STA) 42"
```

### Health & Monitoring

#### GET /api/health

```yaml
  /api/health:
    get:
      tags:
        - Health
      summary: Service health check
      description: Returns the current health status of the API service
      operationId: getHealth
      
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum: [healthy, degraded, unhealthy]
                    example: "healthy"
                  version:
                    type: string
                    example: "2.1.0"
                  uptime:
                    type: integer
                    description: Uptime in seconds
                    example: 86400
                  timestamp:
                    type: string
                    format: date-time
                    example: "2025-01-08T10:30:00Z"
                  services:
                    type: object
                    properties:
                      database:
                        type: string
                        enum: [up, down]
                        example: "up"
                      redis:
                        type: string
                        enum: [up, down]
                        example: "up"
                      ocr:
                        type: string
                        enum: [up, down]
                        example: "up"
                      scryfall:
                        type: string
                        enum: [up, down]
                        example: "up"
```

#### GET /api/metrics

```yaml
  /api/metrics:
    get:
      tags:
        - Health
      summary: Prometheus metrics endpoint
      description: Returns service metrics in Prometheus format
      operationId: getMetrics
      security:
        - ApiKeyAuth: []
      
      responses:
        '200':
          description: Metrics retrieved successfully
          content:
            text/plain:
              schema:
                type: string
                example: |
                  # HELP api_requests_total Total API requests
                  # TYPE api_requests_total counter
                  api_requests_total{method="GET",endpoint="/api/ocr/status",status="200"} 1234
                  
                  # HELP ocr_processing_duration_seconds OCR processing duration
                  # TYPE ocr_processing_duration_seconds histogram
                  ocr_processing_duration_seconds_bucket{le="1"} 100
                  ocr_processing_duration_seconds_bucket{le="2"} 150
                  ocr_processing_duration_seconds_bucket{le="5"} 190
```

## Data Schemas

### Card Schemas

```yaml
components:
  schemas:
    CardDetails:
      type: object
      properties:
        id:
          type: string
          format: uuid
          example: "e3285e6b-3e79-4d7c-bf96-d920f973b122"
        name:
          type: string
          example: "Lightning Bolt"
        manaCost:
          type: string
          example: "{R}"
        cmc:
          type: number
          example: 1
        typeLine:
          type: string
          example: "Instant"
        oracleText:
          type: string
          example: "Lightning Bolt deals 3 damage to any target."
        power:
          type: string
          nullable: true
          example: null
        toughness:
          type: string
          nullable: true
          example: null
        colors:
          type: array
          items:
            type: string
            enum: [W, U, B, R, G]
          example: ["R"]
        colorIdentity:
          type: array
          items:
            type: string
            enum: [W, U, B, R, G]
          example: ["R"]
        legalities:
          type: object
          additionalProperties:
            type: string
            enum: [legal, not_legal, restricted, banned]
          example:
            standard: "not_legal"
            modern: "legal"
            legacy: "legal"
            vintage: "legal"
            commander: "legal"
        prices:
          type: object
          properties:
            usd:
              type: string
              nullable: true
              example: "1.50"
            usd_foil:
              type: string
              nullable: true
              example: "5.00"
            eur:
              type: string
              nullable: true
              example: "1.20"
            eur_foil:
              type: string
              nullable: true
              example: "4.50"
        imageUris:
          type: object
          properties:
            small:
              type: string
              format: uri
            normal:
              type: string
              format: uri
            large:
              type: string
              format: uri
            png:
              type: string
              format: uri
        setCode:
          type: string
          example: "STA"
        setName:
          type: string
          example: "Strixhaven Mystical Archive"
        collectorNumber:
          type: string
          example: "42"
        rarity:
          type: string
          enum: [common, uncommon, rare, mythic, special]
          example: "uncommon"
        artist:
          type: string
          example: "Christopher Rush"
        releaseDate:
          type: string
          format: date
          example: "2021-04-23"
```

### OCR Schemas

```yaml
    OcrProcessing:
      type: object
      properties:
        processId:
          type: string
          format: uuid
        status:
          type: string
          enum: [queued, processing]
        progress:
          type: integer
          minimum: 0
          maximum: 100
          description: Processing progress percentage
        currentStep:
          type: string
          description: Current processing step
          example: "Extracting text from image"
        startedAt:
          type: string
          format: date-time
        estimatedTimeRemaining:
          type: integer
          description: Estimated seconds remaining
    
    OcrCompleted:
      type: object
      properties:
        processId:
          type: string
          format: uuid
        status:
          type: string
          enum: [completed]
        result:
          type: object
          properties:
            mainboard:
              $ref: '#/components/schemas/DeckSection'
            sideboard:
              $ref: '#/components/schemas/DeckSection'
            commander:
              type: string
              nullable: true
              description: Commander for EDH decks
            companion:
              type: string
              nullable: true
              description: Companion card
            metadata:
              type: object
              properties:
                processingTime:
                  type: number
                  description: Processing time in seconds
                confidence:
                  type: number
                  minimum: 0
                  maximum: 1
                  description: Overall confidence score
                corrections:
                  type: integer
                  description: Number of auto-corrections applied
                language:
                  type: string
                  description: Detected language
                format:
                  type: string
                  description: Detected deck format
                imageQuality:
                  type: string
                  enum: [excellent, good, fair, poor]
        completedAt:
          type: string
          format: date-time
    
    OcrFailed:
      type: object
      properties:
        processId:
          type: string
          format: uuid
        status:
          type: string
          enum: [failed]
        error:
          type: object
          properties:
            code:
              type: string
              example: "OCR_FAILED"
            message:
              type: string
              example: "Failed to extract text from image"
            details:
              type: string
              nullable: true
        failedAt:
          type: string
          format: date-time
    
    DeckSection:
      type: object
      properties:
        count:
          type: integer
          description: Total number of cards
          example: 60
        cards:
          type: array
          items:
            type: object
            properties:
              name:
                type: string
                example: "Lightning Bolt"
              quantity:
                type: integer
                minimum: 1
                maximum: 4
                example: 4
              validated:
                type: boolean
                description: Whether the card name was validated
                example: true
              corrected:
                type: boolean
                description: Whether the card name was auto-corrected
                example: false
              originalName:
                type: string
                nullable: true
                description: Original name before correction
                example: "Lightming Bolt"
              set:
                type: string
                nullable: true
                example: "STA"
              collectorNumber:
                type: string
                nullable: true
                example: "42"
              scryfallId:
                type: string
                format: uuid
                nullable: true
```

## Error Responses

```yaml
components:
  responses:
    BadRequest:
      description: Bad request - Invalid input parameters
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: "INVALID_INPUT"
              message: "The provided image format is not supported"
              details:
                - field: "image"
                  issue: "Must be PNG, JPG, or WebP"
    
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: "NOT_FOUND"
              message: "Job with ID '550e8400-e29b-41d4-a716-446655440000' not found"
    
    PayloadTooLarge:
      description: Request payload too large
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: "PAYLOAD_TOO_LARGE"
              message: "Image size exceeds maximum allowed size of 10MB"
              details:
                maxSize: "10485760"
                receivedSize: "15728640"
    
    TooManyRequests:
      description: Rate limit exceeded
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: "RATE_LIMIT_EXCEEDED"
              message: "Rate limit exceeded. Please try again later."
              details:
                limit: 10
                window: "60s"
                retryAfter: 45
      headers:
        X-RateLimit-Limit:
          schema:
            type: integer
          description: Request limit per window
        X-RateLimit-Remaining:
          schema:
            type: integer
          description: Remaining requests in window
        X-RateLimit-Reset:
          schema:
            type: integer
          description: Unix timestamp when limit resets
        Retry-After:
          schema:
            type: integer
          description: Seconds until retry is allowed
    
    InternalServerError:
      description: Internal server error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: "INTERNAL_ERROR"
              message: "An unexpected error occurred. Please try again later."
              requestId: "req_abc123"
  
  schemas:
    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: object
          required:
            - code
            - message
          properties:
            code:
              type: string
              description: Machine-readable error code
              example: "VALIDATION_ERROR"
            message:
              type: string
              description: Human-readable error message
              example: "The request could not be validated"
            details:
              type: array
              items:
                type: object
              description: Additional error details
            requestId:
              type: string
              description: Unique request ID for support
              example: "req_abc123"
            timestamp:
              type: string
              format: date-time
              description: Error timestamp
              example: "2025-01-08T10:30:00Z"
```

## Rate Limiting

```yaml
x-rate-limiting:
  description: |
    API rate limiting is enforced to ensure fair usage and service stability.
    Different tiers have different limits.
  
  tiers:
    anonymous:
      description: Unauthenticated requests
      limits:
        - endpoint: /api/ocr
          limit: 10
          window: 60s
        - endpoint: /api/cards/*
          limit: 100
          window: 60s
        - endpoint: /api/export
          limit: 50
          window: 60s
        - endpoint: global
          limit: 200
          window: 60s
    
    authenticated:
      description: Authenticated with API key
      limits:
        - endpoint: /api/ocr
          limit: 30
          window: 60s
        - endpoint: /api/cards/*
          limit: 500
          window: 60s
        - endpoint: /api/export
          limit: 200
          window: 60s
        - endpoint: global
          limit: 1000
          window: 60s
    
    premium:
      description: Premium tier with JWT auth
      limits:
        - endpoint: /api/ocr
          limit: 100
          window: 60s
        - endpoint: /api/cards/*
          limit: 2000
          window: 60s
        - endpoint: /api/export
          limit: 500
          window: 60s
        - endpoint: global
          limit: 5000
          window: 60s
  
  headers:
    X-RateLimit-Limit:
      description: The rate limit ceiling for that endpoint
      type: integer
      example: 100
    
    X-RateLimit-Remaining:
      description: The number of requests left for the window
      type: integer
      example: 94
    
    X-RateLimit-Reset:
      description: Unix timestamp when the rate limit window resets
      type: integer
      example: 1704713400
    
    Retry-After:
      description: Seconds to wait before retrying (only on 429 responses)
      type: integer
      example: 45
  
  strategies:
    type: sliding-window
    storage: redis
    keyPattern: "ratelimit:{tier}:{userId}:{endpoint}"
    enforcement: strict
```

## Webhooks

```yaml
x-webhooks:
  description: |
    Webhook support for asynchronous notifications (Premium feature).
    Configure webhooks to receive real-time updates.
  
  events:
    ocr.completed:
      description: Fired when OCR processing completes
      payload:
        type: object
        properties:
          event:
            type: string
            example: "ocr.completed"
          timestamp:
            type: string
            format: date-time
          data:
            $ref: '#/components/schemas/OcrCompleted'
    
    ocr.failed:
      description: Fired when OCR processing fails
      payload:
        type: object
        properties:
          event:
            type: string
            example: "ocr.failed"
          timestamp:
            type: string
            format: date-time
          data:
            $ref: '#/components/schemas/OcrFailed'
    
    export.completed:
      description: Fired when export generation completes
      payload:
        type: object
        properties:
          event:
            type: string
            example: "export.completed"
          timestamp:
            type: string
            format: date-time
          data:
            type: object
            properties:
              format:
                type: string
              downloadUrl:
                type: string
                format: uri
  
  configuration:
    endpoint:
      type: string
      format: uri
      description: Your webhook endpoint URL
      example: "https://yourapp.com/webhooks/screentodeck"
    
    secret:
      type: string
      description: Shared secret for HMAC signature validation
      example: "whsec_abc123..."
    
    events:
      type: array
      items:
        type: string
      description: List of events to subscribe to
      example: ["ocr.completed", "ocr.failed"]
    
    retryPolicy:
      type: object
      properties:
        maxAttempts:
          type: integer
          default: 3
        backoffMultiplier:
          type: number
          default: 2
        initialDelay:
          type: integer
          default: 1000
          description: Initial retry delay in milliseconds
```

## Code Examples

### JavaScript/TypeScript

```typescript
// TypeScript SDK Example
import { ScreenToDeckAPI } from '@screentodeck/api-client';

const api = new ScreenToDeckAPI({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.screentodeck.com/v2'
});

async function scanDeck(imagePath: string) {
  try {
    // 1. Upload image for OCR
    const { processId } = await api.ocr.create({
      image: fs.createReadStream(imagePath),
      options: {
        format: 'auto',
        enhance: true
      }
    });
    
    // 2. Wait for completion
    const result = await api.ocr.waitForCompletion(processId, {
      timeout: 30000,
      pollInterval: 1000
    });
    
    // 3. Export to MTGA format
    const exported = await api.export.create({
      deck: result.result,
      format: 'mtga',
      options: {
        includeSetCodes: true
      }
    });
    
    console.log('Deck exported:', exported.content);
    
  } catch (error) {
    console.error('Scan failed:', error);
  }
}
```

### Python

```python
# Python SDK Example
from screentodeck import ScreenToDeckAPI
import asyncio

api = ScreenToDeckAPI(
    api_key="your-api-key",
    base_url="https://api.screentodeck.com/v2"
)

async def scan_deck(image_path: str):
    try:
        # 1. Upload image for OCR
        with open(image_path, 'rb') as f:
            job = await api.ocr.create(
                image=f,
                options={
                    'format': 'auto',
                    'enhance': True
                }
            )
        
        # 2. Wait for completion
        result = await api.ocr.wait_for_completion(
            job['processId'],
            timeout=30,
            poll_interval=1
        )
        
        # 3. Export to MTGA format
        exported = await api.export.create(
            deck=result['result'],
            format='mtga',
            options={
                'includeSetCodes': True
            }
        )
        
        print(f"Deck exported:\n{exported['content']}")
        
    except Exception as e:
        print(f"Scan failed: {e}")

# Run the async function
asyncio.run(scan_deck("deck_screenshot.png"))
```

### cURL

```bash
# 1. Upload image for OCR
curl -X POST https://api.screentodeck.com/v2/api/ocr \
  -H "X-API-Key: your-api-key" \
  -F "image=@deck_screenshot.png" \
  -F 'options={"format":"auto","enhance":true}'

# Response: {"processId":"550e8400-e29b-41d4-a716-446655440000","status":"processing"}

# 2. Check status
curl -X GET https://api.screentodeck.com/v2/api/ocr/status/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-API-Key: your-api-key"

# 3. Export deck
curl -X POST https://api.screentodeck.com/v2/api/export \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "deck": {
      "mainboard": [
        {"name": "Lightning Bolt", "quantity": 4}
      ],
      "sideboard": []
    },
    "format": "mtga"
  }'
```

## SDK Support

### Official SDKs

```yaml
sdks:
  javascript:
    package: "@screentodeck/api-client"
    npm: "npm install @screentodeck/api-client"
    github: "https://github.com/screentodeck/js-sdk"
    documentation: "https://docs.screentodeck.com/sdks/javascript"
  
  python:
    package: "screentodeck"
    pip: "pip install screentodeck"
    github: "https://github.com/screentodeck/python-sdk"
    documentation: "https://docs.screentodeck.com/sdks/python"
  
  go:
    package: "github.com/screentodeck/go-sdk"
    install: "go get github.com/screentodeck/go-sdk"
    github: "https://github.com/screentodeck/go-sdk"
    documentation: "https://docs.screentodeck.com/sdks/go"
  
  ruby:
    gem: "screentodeck"
    install: "gem install screentodeck"
    github: "https://github.com/screentodeck/ruby-sdk"
    documentation: "https://docs.screentodeck.com/sdks/ruby"
```

### OpenAPI Generator

```bash
# Generate client SDK using OpenAPI Generator
openapi-generator generate \
  -i https://api.screentodeck.com/v2/openapi.yaml \
  -g typescript-axios \
  -o ./generated-client

# Available generators:
# typescript-axios, typescript-fetch, python, java, go, ruby, php, csharp, swift
```

## Changelog

### Version 2.1.0 (Current)
- Added guaranteed 60+15 card extraction
- Improved OCR accuracy with preprocessing
- Added clipboard auto-copy feature
- Enhanced Scryfall validation with fuzzy matching
- Added support for multiple export formats
- Implemented rate limiting tiers
- Added webhook support for async notifications

### Version 2.0.0
- Complete API redesign
- Migrated to OpenAPI 3.0 specification
- Added async job processing
- Implemented Redis caching
- Added Prometheus metrics endpoint
- Enhanced error handling and validation

### Version 1.5.0
- Initial public API release
- Basic OCR functionality
- MTGA export format only
- Synchronous processing

## Support & Resources

```yaml
support:
  documentation: https://docs.screentodeck.com
  api_status: https://status.screentodeck.com
  support_email: api-support@screentodeck.com
  discord: https://discord.gg/screentodeck
  
resources:
  postman_collection: https://api.screentodeck.com/postman.json
  openapi_spec: https://api.screentodeck.com/openapi.yaml
  example_apps: https://github.com/screentodeck/examples
  
terms:
  terms_of_service: https://screentodeck.com/terms
  privacy_policy: https://screentodeck.com/privacy
  sla: https://screentodeck.com/sla
```

---

*API Specification v2.1.0 - Last updated: 2025-01-08*
*© 2025 MTG Screen-to-Deck - All rights reserved*