/**
 * ICE Server Configuration
 *
 * STUN servers help peers discover their public IP/port.
 * TURN servers relay media when direct P2P fails (symmetric NAT, corporate firewalls).
 *
 * For production:
 *  - Deploy your own Coturn server, OR
 *  - Use Twilio Network Traversal (https://www.twilio.com/docs/stun-turn)
 *  - Replace the TURN block below with real credentials (rotate via API).
 *  - Without TURN, ~15-20% of real-world connections will fail.
 */

const iceServers = [
    // ── Public STUN servers (free, best-effort) ──
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },

    // ── TURN server (uncomment & fill for production) ──
    //
    // Option A: Self-hosted Coturn
    // {
    //     urls: process.env.TURN_URL || 'turn:your-turn-server.com:3478',
    //     username: process.env.TURN_USERNAME || '',
    //     credential: process.env.TURN_CREDENTIAL || '',
    // },
    //
    // Option B: Twilio Network Traversal
    // Fetch ephemeral credentials from Twilio API at runtime:
    //   const token = await twilioClient.tokens.create();
    //   return token.iceServers;
];

export default iceServers;
