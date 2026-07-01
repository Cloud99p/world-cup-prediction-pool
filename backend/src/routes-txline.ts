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
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    console.log('📡 Opening SSE odds stream (relaying from TxLINE)...');
    
    // Flush headers immediately
    res.flushHeaders();
    
    // Connect to TxLINE's native SSE stream and relay to frontend
    const txlineStream = await fetch(`${txlineClient['config'].baseUrl}/api/odds/stream`, {
      headers: {
        'Authorization': `Bearer ${txlineClient['config'].jwt}`,
        'X-Api-Token': txlineClient['config'].apiToken,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!txlineStream.ok) {
      throw new Error(`TxLINE stream failed: ${txlineStream.status}`);
    }
    
    console.log('✅ Connected to TxLINE odds stream');
    
    // Relay SSE messages from TxLINE to frontend
    const reader = txlineStream.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE messages (separated by double newline)
      const messages = buffer.split('\n\n');
      buffer = messages.pop() || ''; // Keep incomplete message in buffer
      
      for (const message of messages) {
        if (message.trim()) {
          // Relay the message to frontend
          res.write(`${message}\n\n`);
          
          // Log odds updates for debugging
          try {
            const dataLine = message.split('\n').find(line => line.startsWith('data:'));
            if (dataLine) {
              const data = JSON.parse(dataLine.slice(5).trim());
              if (data.FixtureId) {
                console.log(`📊 TxLINE odds update: Fixture ${data.FixtureId}, ${data.MarketType || data.Market}`);
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
    
    console.log('🔌 TxLINE odds stream ended');
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    console.log('⚽ Opening SSE scores stream (relaying from TxLINE)...');
    
    // Flush headers immediately
    res.flushHeaders();
    
    // Connect to TxLINE's native SSE stream and relay to frontend
    const txlineStream = await fetch(`${txlineClient['config'].baseUrl}/api/scores/stream`, {
      headers: {
        'Authorization': `Bearer ${txlineClient['config'].jwt}`,
        'X-Api-Token': txlineClient['config'].apiToken,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!txlineStream.ok) {
      throw new Error(`TxLINE stream failed: ${txlineStream.status}`);
    }
    
    console.log('✅ Connected to TxLINE scores stream');
    
    // Relay SSE messages from TxLINE to frontend
    const reader = txlineStream.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE messages (separated by double newline)
      const messages = buffer.split('\n\n');
      buffer = messages.pop() || ''; // Keep incomplete message in buffer
      
      for (const message of messages) {
        if (message.trim()) {
          // Relay the message to frontend
          res.write(`${message}\n\n`);
          
          // Log score updates for debugging
          try {
            const dataLine = message.split('\n').find(line => line.startsWith('data:'));
            if (dataLine) {
              const data = JSON.parse(dataLine.slice(5).trim());
              if (data.HomeScore !== undefined || data.AwayScore !== undefined) {
                console.log(`⚽ TxLINE score update: Fixture ${data.FixtureId}, ${data.HomeScore}-${data.AwayScore}, ${data.GameState}`);
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
    
    console.log('🔌 TxLINE scores stream ended');
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
