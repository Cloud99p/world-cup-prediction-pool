# Backend API Endpoints

Complete API reference for the World Cup Prediction Pool backend.

**Base URL:** `http://localhost:8080` (development)  
**TxLINE API:** `https://txline.txodds.com/api`

---

## Authentication

All TxLINE API requests require two headers:

```bash
Authorization: Bearer <JWT_TOKEN>
X-Api-Token: txoracle_api_99b22fb42ba348c4b30767321eafdf1c
```

---

## Fixtures Endpoints

### Get All Fixtures

```bash
GET /api/matches
```

**Query Parameters:**
- `competitionId` (optional) - Filter by specific competition ID

**Example:**
```bash
# Get all fixtures
curl http://localhost:8080/api/matches

# Get fixtures for specific competition (e.g., World Cup)
curl http://localhost:8080/api/matches?competitionId=500005
```

**Response:**
```json
{
  "matches": [
    {
      "FixtureId": 17952170,
      "CompetitionId": 500005,
      "Participant1": "Brazil",
      "Participant2": "Germany",
      "Participant1IsHome": true,
      "StartTime": 1719846000,
      "Status": "scheduled"
    }
  ],
  "source": "txline"
}
```

---

### Get Fixture Details

```bash
GET /api/matches/:fixtureId
```

**Example:**
```bash
curl http://localhost:8080/api/matches/17952170
```

**Response:**
```json
{
  "match": {
    "FixtureId": 17952170,
    "CompetitionId": 500005,
    "Participant1": "Brazil",
    "Participant2": "Germany",
    "Participant1IsHome": true,
    "StartTime": 1719846000,
    "Status": "scheduled"
  }
}
```

---

## Odds Endpoints

### Get Odds Snapshot

```bash
GET /api/odds/:fixtureId
```

**Example:**
```bash
curl http://localhost:8080/api/odds/17952170
```

**Response:**
```json
{
  "odds": [
    {
      "FixtureId": 17952170,
      "MarketType": "1X2",
      "Odds": [2.5, 3.2, 2.8],
      "Timestamp": 1719846000,
      "Seq": 12345
    }
  ],
  "source": "txline"
}
```

---

## Scores Endpoints

### Get Scores Snapshot

```bash
GET /api/scores/:fixtureId
```

**Example:**
```bash
curl http://localhost:8080/api/scores/17952170
```

**Response:**
```json
{
  "scores": [
    {
      "FixtureId": 17952170,
      "HomeScore": 2,
      "AwayScore": 1,
      "GameState": "2H",
      "Timestamp": 1719849600,
      "Seq": 67890
    }
  ],
  "source": "txline"
}
```

---

### Get Historical Scores

```bash
GET /api/scores/historical/:fixtureId
```

**Note:** Only available for fixtures that started between 2 weeks and 6 hours ago.

**Example:**
```bash
curl http://localhost:8080/api/scores/historical/17952170
```

**Response:**
```json
{
  "scores": [
    {
      "FixtureId": 17952170,
      "Seq": 1,
      "GameState": "1H",
      "HomeScore": 1,
      "AwayScore": 0,
      "Timestamp": 1719847800
    },
    {
      "FixtureId": 17952170,
      "Seq": 2,
      "GameState": "HT",
      "HomeScore": 1,
      "AwayScore": 0,
      "Timestamp": 1719850500
    }
  ],
  "source": "txline"
}
```

---

## Utility Endpoints

### Health Check

```bash
GET /health
```

**Example:**
```bash
curl http://localhost:8080/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1719846000000
}
```

---

### Get Active Pools

```bash
GET /api/pools
```

**Example:**
```bash
curl http://localhost:8080/api/pools
```

**Response:**
```json
[
  {
    "fixtureId": 17952170,
    "homeTeam": "Brazil",
    "awayTeam": "Germany",
    "startTime": "2026-07-01T15:00:00Z",
    "totalStaked": 1000000,
    "betCount": 42,
    "isSettled": false
  }
]
```

---

## SSE Stream Endpoints (Direct TxLINE)

For real-time data, connect directly to TxLINE SSE streams:

### Odds Stream

```bash
curl -H "Authorization: Bearer <JWT>" \
     -H "X-Api-Token: txoracle_api_99b22fb42ba348c4b30767321eafdf1c" \
     "https://txline.txodds.com/api/odds/stream"
```

### Scores Stream

```bash
curl -H "Authorization: Bearer <JWT>" \
     -H "X-Api-Token: txoracle_api_99b22fb42ba348c4b30767321eafdf1c" \
     "https://txline.txodds.com/api/scores/stream"
```

---

## Competition IDs

Common competition IDs for filtering:

| Competition | ID |
|-------------|-----|
| FIFA World Cup | 500005 |
| UEFA Champions League | 500001 |
| English Premier League | 500002 |
| La Liga | 500003 |
| Serie A | 500004 |
| International Friendlies | 500010 |

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "TxLINE not configured"
}
```

### 404 Not Found
```json
{
  "error": "Fixture not found"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or expired JWT"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch matches",
  "message": "Request failed with status code 500"
}
```

---

## Rate Limits

- **Free Tier (Service Level 1):** 60-second delay on live data
- **Rate Limit:** As per TxLINE subscription tier
- **JWT Expiry:** JWTs expire after ~30 days, refresh via `/auth/guest/start`

---

## Quick Start Examples

### Get All World Cup Fixtures
```bash
curl "http://localhost:8080/api/matches?competitionId=500005"
```

### Get Odds for Specific Match
```bash
curl http://localhost:8080/api/odds/17952170
```

### Get Live Scores
```bash
curl http://localhost:8080/api/scores/17952170
```

### Get Full Match Data
```bash
# Get fixture details
curl http://localhost:8080/api/matches/17952170

# Get odds
curl http://localhost:8080/api/odds/17952170

# Get scores
curl http://localhost:8080/api/scores/17952170
```

---

## Source

Based on official TxLINE API documentation: https://txline-docs.txodds.com
