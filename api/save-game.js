// /api/save-game.js - Save analyzed games to database
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { gameData, analysisData, userToken } = req.body;

        if (!gameData || !userToken) {
            return res.status(400).json({ error: 'Missing required data' });
        }

        // Initialize Supabase with service key for server-side operations
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY // You'll need this key from Supabase
        );

        // Verify user token
        const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
        
        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid user token' });
        }

        // Calculate metrics for storage
        const killEfficiency = gameData.killAttempts > 0 ? (gameData.totalKills / gameData.killAttempts * 100) : 0;
        const acesPerSet = gameData.totalSets > 0 ? (gameData.serviceAces / gameData.totalSets) : 0;
        const receptionErrorRate = gameData.totalSets > 0 ? (gameData.receptionErrors / gameData.totalSets) : 0;
        const blocksPerSet = gameData.totalSets > 0 ? (gameData.totalBlocks / gameData.totalSets) : 0;
        const digsPerSet = gameData.totalSets > 0 ? (gameData.digs / gameData.totalSets) : 0;

        // Insert game record
        const { data: savedGame, error: saveError } = await supabase
            .from('games')
            .insert([
                {
                    user_id: user.id,
                    opponent: gameData.opponent,
                    game_date: gameData.gameDate,
                    total_kills: gameData.totalKills,
                    kill_attempts: gameData.killAttempts,
                    service_aces: gameData.serviceAces,
                    service_errors: gameData.serviceErrors,
                    reception_errors: gameData.receptionErrors,
                    total_blocks: gameData.totalBlocks,
                    digs: gameData.digs,
                    total_sets: gameData.totalSets,
                    analysis_data: {
                        kill_efficiency: killEfficiency,
                        aces_per_set: acesPerSet,
                        reception_error_rate: receptionErrorRate,
                        blocks_per_set: blocksPerSet,
                        digs_per_set: digsPerSet,
                        analysis_text: analysisData || null,
                        analyzed_at: new Date().toISOString()
                    }
                }
            ])
            .select()
            .single();

        if (saveError) {
            throw saveError;
        }

        return res.status(200).json({
            success: true,
            game: savedGame,
            message: 'Game saved successfully'
        });

    } catch (error) {
        console.error('Save game error:', error);
        return res.status(500).json({
            error: 'Failed to save game',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}
