/**
 * TxLINE API Routes - Official Implementation
 * Order matters! Most specific routes FIRST, generic routes LAST
 */

import { Express } from 'express';
import TxLINEClient from './txline-client.js';

export function registerTxLINERoutes(app: Express, txlineClient: TxLINEClient) {

/**
 * ==================== SSE STREAMS (MUST BE FIRST!) ====================
 * These must come before any routes with dynamic parameters like :fixtureId
 */

/**
 * SSE Stream for real-time odds updates
 */
app.get('/api/odds/stream', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    console.log('📡 Opening SSE odds stream...');
    
    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Odds stream connected' })}\n\n`);
    
    // Send heartbeat every 2 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
    }, 2000);
    
    // Poll for odds updates every 5 seconds (fallback since TxLINE SSE is unavailable)
    const pollInterval = setInterval(async () => {
      try {
        const fixtures = await txlineClient.getFixtures();
        const liveFixtures = fixtures.filter((f: any) => {
          const startTime = f.StartTime || 0;
          const now = Date.now();
          const matchEnd = startTime + (2 * 60 * 60 * 1000);
          return startTime < now && matchEnd > now;
        });
        
        for (const fixture of liveFixtures) {
          try {
            const odds = await txlineClient.getOddsSnapshot(fixture.FixtureId);
            const overUnder = odds.find((o: any) => o.Market?.includes('Over/Under 2.5'));
            if (overUnder) {
              const data = {
                type: 'odds_update',
                fixtureId: fixture.FixtureId,
                marketType: 'Over/Under 2.5',
                odds: [overUnder.Outcomes?.[0]?.Price ?? 0, overUnder.Outcomes?.[1]?.Price ?? 0],
                timestamp: Date.now(),
              };
              res.write(`data: ${JSON.stringify(data)}\n\n`);
            }
          } catch (oddsError: any) {
            // Ignore individual fixture odds errors
          }
        }
      } catch (error: any) {
        console.log('⚠️ Odds polling error:', error.message);
      }
    }, 5000);
    
    req.on('close', () => {
      console.log('🔌 Client disconnected from odds stream');
      clearInterval(pollInterval);
      clearInterval(heartbeatInterval);
    });
    
  } catch (error: any) {
    console.error('❌ Failed to open odds stream:', error.message);
    res.end();
  }
});

/**
 * SSE Stream for real-time scores updates
 */
app.get('/api/scores/stream', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    console.log('⚽ Opening SSE scores stream...');
    
    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Scores stream connected' })}\n\n`);
    
    // Send heartbeat every 2 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
    }, 2000);
    
    // Poll for score updates every 5 seconds (fallback since TxLINE SSE is unavailable)
    const pollInterval = setInterval(async () => {
      try {
        const fixtures = await txlineClient.getFixtures();
        const liveFixtures = fixtures.filter((f: any) => {
          const startTime = f.StartTime || 0;
          const now = Date.now();
          const matchEnd = startTime + (2 * 60 * 60 * 1000);
          return startTime < now && matchEnd > now;
        });
        
        for (const fixture of liveFixtures) {
          try {
            // Fetch actual scores from TxLINE
            const scores = await txlineClient.getScoresSnapshot(fixture.FixtureId);
            const latestScore = scores[0];
            
            const data = {
              type: 'score_update',
              fixtureId: fixture.FixtureId,
              homeScore: latestScore?.HomeScore ?? 0,
              awayScore: latestScore?.AwayScore ?? 0,
              gameState: latestScore?.GameState || fixture.Status || 'live',
              timestamp: Date.now(),
            };
            console.log(`⚽ Score update: ${fixture.Participant1} ${data.homeScore}-${data.awayScore} ${fixture.Participant2}`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
          } catch (scoreError: any) {
            // Ignore individual fixture score errors
          }
        }
      } catch (error: any) {
        console.log('⚠️ Score polling error:', error.message);
      }
    }, 5000);
    
    req.on('close', () => {
      console.log('🔌 Client disconnected from scores stream');
      clearInterval(pollInterval);
      clearInterval(heartbeatInterval);
    });
    
  } catch (error: any) {
    console.error('❌ Failed to open scores stream:', error.message);
    res.end();
  }
});

/**
 * ==================== ODDS ENDPOINTS ====================
 * Order matters! Most specific routes FIRST, generic routes LAST
 */

/**
 * Get odds updates by time period (TxLINE: /api/odds/updates/{epochDay}/{hourOfDay}/{interval})
 * MUST come before /api/odds/updates/:fixtureId
 */
app.get('/api/odds/updates/:epochDay/:hourOfDay/:interval', async (req, res) => {
  try {
    const epochDay = parseInt(req.params.epochDay);
    const hourOfDay = parseInt(req.params.hourOfDay);
    const interval = parseInt(req.params.interval);
    
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const fixtureId = req.query.fixtureId ? parseInt(req.query.fixtureId as string) : undefined;
    const odds = await txlineClient.getOddsUpdatesByInterval(epochDay, hourOfDay, interval, fixtureId);
    res.json({ odds, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch odds updates by interval:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch odds updates by interval',
      message: error.message,
    });
  }
});

/**
 * Get live odds updates for a fixture (TxLINE: /api/odds/updates/{fixtureId})
 * MUST come before /api/odds/:fixtureId
 */
app.get('/api/odds/updates/:fixtureId', async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.fixtureId);
    
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const odds = await txlineClient.getOddsUpdates(fixtureId);
    res.json({ odds, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch odds updates:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch odds updates',
      message: error.message,
    });
  }
});

/**
 * Get odds snapshot for a fixture (TxLINE: /api/odds/snapshot/{fixtureId})
 */
app.get('/api/odds/:fixtureId', async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.fixtureId);
    
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const odds = await txlineClient.getOddsSnapshot(fixtureId);
    res.json({ odds, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch odds:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch odds',
      message: error.message,
    });
  }
});

/**
 * Get all odds for all matches
 */
app.get('/api/odds', async (req, res) => {
  try {
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    // Get all fixtures first
    const fixtures = await txlineClient.getFixtures();
    
    // Fetch odds for each fixture
    const oddsPromises = fixtures.map(async (fixture: any) => {
      try {
        const odds = await txlineClient.getOddsSnapshot(fixture.FixtureId);
        return {
          fixtureId: fixture.FixtureId,
          odds: odds || [],
        };
      } catch (error: any) {
        return {
          fixtureId: fixture.FixtureId,
          odds: [],
        };
      }
    });
    
    const allOdds = await Promise.all(oddsPromises);
    res.json({ odds: allOdds, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch odds:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch odds',
      message: error.message,
    });
  }
});

/**
 * ==================== SCORES ENDPOINTS ====================
 * Order matters! Most specific routes FIRST, generic routes LAST
 */

/**
 * Get scores updates by time period (TxLINE: /api/scores/updates/{epochDay}/{hourOfDay}/{interval})
 * MUST come before /api/scores/updates/:fixtureId
 */
app.get('/api/scores/updates/:epochDay/:hourOfDay/:interval', async (req, res) => {
  try {
    const epochDay = parseInt(req.params.epochDay);
    const hourOfDay = parseInt(req.params.hourOfDay);
    const interval = parseInt(req.params.interval);
    
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const fixtureId = req.query.fixtureId ? parseInt(req.query.fixtureId as string) : undefined;
    const scores = await txlineClient.getScoresUpdatesByInterval(epochDay, hourOfDay, interval, fixtureId);
    res.json({ scores, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch scores updates by interval:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch scores updates by interval',
      message: error.message,
    });
  }
});

/**
 * Get live scores updates for a fixture (TxLINE: /api/scores/updates/{fixtureId})
 * MUST come before /api/scores/:fixtureId
 */
app.get('/api/scores/updates/:fixtureId', async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.fixtureId);
    
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const scores = await txlineClient.getScoresUpdates(fixtureId);
    res.json({ scores, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch scores updates:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch scores updates',
      message: error.message,
    });
  }
});

/**
 * Get historical scores for a fixture (TxLINE: /api/scores/historical/{fixtureId})
 */
app.get('/api/scores/historical/:fixtureId', async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.fixtureId);
    
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const scores = await txlineClient.getHistoricalScores(fixtureId);
    res.json({ scores, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch historical scores:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch historical scores',
      message: error.message,
    });
  }
});

/**
 * Get scores snapshot for a fixture (TxLINE: /api/scores/snapshot/{fixtureId})
 */
app.get('/api/scores/:fixtureId', async (req, res) => {
  try {
    const fixtureId = parseInt(req.params.fixtureId);
    
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const scores = await txlineClient.getScoresSnapshot(fixtureId);
    res.json({ scores, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch scores:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch scores',
      message: error.message,
    });
  }
});

/**
 * ==================== FIXTURES ENDPOINTS ====================
 */

/**
 * Get fixture updates by time period (TxLINE: /api/fixtures/updates/{epochDay}/{hourOfDay})
 */
app.get('/api/fixtures/updates/:epochDay/:hourOfDay', async (req, res) => {
  try {
    const epochDay = parseInt(req.params.epochDay);
    const hourOfDay = parseInt(req.params.hourOfDay);
    
    if (!process.env.TXLINE_API_TOKEN) {
      return res.status(400).json({ error: 'TxLINE not configured' });
    }

    const fixtures = await txlineClient.getFixtureUpdates(epochDay, hourOfDay);
    res.json({ fixtures, source: 'txline' });
  } catch (error: any) {
    console.error('Failed to fetch fixture updates:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch fixture updates',
      message: error.message,
    });
  }
});

} // End of registerTxLINERoutes
