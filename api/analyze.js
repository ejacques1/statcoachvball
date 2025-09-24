// /api/analyze.js - Vercel serverless function
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { stats, metrics } = req.body;

        // Validate required data
        if (!stats || !metrics) {
            return res.status(400).json({ error: 'Missing stats or metrics data' });
        }

        // Build the AI prompt with research data and game stats
        const prompt = `You are StatCoach Volleyball, a professional volleyball analysis tool that provides research-backed insights to college coaches.

CRITICAL RESEARCH DATA FROM NCAA DIVISION I STUDY:
- Service Aces: OR = 1.338 (each ace increases win probability by 33.8% - STRONGEST positive predictor)
- Reception Errors: OR = 0.757 (each error REDUCES win probability by 24.3% - STRONGEST negative predictor)
- Kills: OR = 1.255 (each kill increases win probability by 25.5%)
- Solo Blocks: OR = 1.257 (each block increases win probability by 25.7% - nearly as valuable as kills)
- Digs: OR = 1.152 (each dig increases win probability by 15.2%)
- Attack Attempts: OR = 0.881 (more attempts actually REDUCE win probability - efficiency over volume)

NCAA WINNING vs LOSING TEAM BENCHMARKS:
- Kills: Winners avg 46.9, Losers avg 42.8
- Service Aces: Winners avg 6.45, Losers avg 3.93  
- Reception Errors: Winners avg 3.71, Losers avg 6.17
- Digs: Winners avg 31.1, Losers avg 29.5
- Solo Blocks: Winners avg 1.94, Losers avg 1.58

CURRENT GAME STATISTICS:
- Opponent: ${stats.opponent}
- Sets Played: ${stats.totalSets}
- Kills: ${stats.totalKills} of ${stats.killAttempts} attempts (${metrics.killEfficiency}% efficiency)
- Service Aces: ${stats.serviceAces} total (${metrics.acesPerSet} per set)
- Service Errors: ${stats.serviceErrors} total
- Reception Errors: ${stats.receptionErrors} total (${metrics.receptionErrorRate} per set) 
- Blocks: ${stats.totalBlocks} total (${metrics.blocksPerSet} per set)
- Digs: ${stats.digs} total (${metrics.digsPerSet} per set)

TONE: Professional coach-to-coach communication. Research-backed but practical. No jargon.

STRUCTURE YOUR RESPONSE EXACTLY LIKE THIS:

**Game Impact Summary**
[Brief assessment comparing performance to winning/losing team benchmarks. Mention if metrics fall into winning or losing team ranges.]

**Biggest Advantages**
[List 2-3 top performing areas with specific research impact percentages. Focus on stats that match or exceed winning team averages. Use phrases like "each ace increases win probability by 33.8%" or "your blocks contributed significantly - each one worth +25.7% win probability"]

**Areas for Improvement**  
[Identify key weaknesses compared to research benchmarks. Emphasize reception errors if high (use "CRITICAL ALERT" for 4+ errors). Note missed opportunities in serving or blocking. Reference specific impact percentages.]

**Weekly Practice Recommendations**
**Primary Focus (40% of practice time)**: [Most critical area based on biggest statistical impact - usually reception errors if high, or serving if low]
**Secondary Focus (25% of practice time)**: [Second priority area with research justification]  
**Strengths to Maintain (20% of practice time)**: [Areas performing at winning team levels]

Remember:
- Compare all stats to winning vs losing team benchmarks
- Emphasize that reception errors have the strongest NEGATIVE impact
- Highlight that service aces have the strongest POSITIVE impact  
- Note that efficiency matters more than volume (fewer attempts can be better)
- Use exact research percentages (33.8%, 24.3%, 25.5%, 25.7%, 15.2%)
- Sound like an experienced coach who knows the latest research`;

        // Call OpenRouter API
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://statcoach-volleyball.vercel.app', // Your domain
                'X-Title': 'StatCoach Volleyball'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3-sonnet',
                messages: [
                    {
                        role: 'user', 
                        content: prompt
                    }
                ],
                max_tokens: 1500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('OpenRouter API error:', response.status, errorData);
            return res.status(500).json({ 
                error: 'Analysis service temporarily unavailable',
                details: process.env.NODE_ENV === 'development' ? errorData : undefined
            });
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Unexpected API response structure:', data);
            return res.status(500).json({ error: 'Invalid response from analysis service' });
        }

        const analysis = data.choices[0].message.content;

        // Return successful response
        return res.status(200).json({
            success: true,
            analysis: analysis,
            timestamp: new Date().toISOString(),
            gameId: `${stats.opponent}_${stats.gameDate}`.replace(/\s+/g, '_')
        });

    } catch (error) {
        console.error('API analysis error:', error);
        
        return res.status(500).json({ 
            error: 'Analysis failed',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}
