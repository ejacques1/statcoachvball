/**
 * StatCoach Volleyball - Research-Based Analysis Module
 * Based on NCAA Division I Men's Volleyball Research (2025)
 */

// Research benchmarks from NCAA Division I data
const RESEARCH_BENCHMARKS = {
    // Winning team averages
    win: {
        kills: 46.9,
        errors: 14.3,
        attempts: 96.2,
        serviceAces: 6.45,
        serviceErrors: 16.0,
        receptionErrors: 3.71,
        digs: 31.1,
        soloBlocks: 1.94,
        blockAssists: 13.9,
        blockErrors: 1.24
    },
    // Losing team averages
    loss: {
        kills: 42.8,
        errors: 19.3,
        attempts: 103.0,
        serviceAces: 3.93,
        serviceErrors: 15.5,
        receptionErrors: 6.17,
        digs: 29.5,
        soloBlocks: 1.58,
        blockAssists: 10.4,
        blockErrors: 1.44
    }
};

// Odds ratios from logistic regression (research findings)
const ODDS_RATIOS = {
    kills: 1.255,           // +25.5% per kill
    errors: 0.921,          // -7.9% per error
    attempts: 0.881,        // -11.9% per attempt (efficiency over volume!)
    serviceAces: 1.338,     // +33.8% per ace (strongest positive predictor)
    serviceErrors: 0.992,   // Not significant in research
    receptionErrors: 0.757, // -24.3% per error (strongest negative predictor)
    digs: 1.152,            // +15.2% per dig
    soloBlocks: 1.257,      // +25.7% per solo block
    blockAssists: 1.126,    // +12.6% per block assist
    blockErrors: 0.867      // Not significant in research
};

/**
 * Normalize stats to per-game basis for comparison with research
 * Research data is from full matches (typically 3-4 sets)
 */
function normalizeStats(stats, sets = 3) {
    const normalizationFactor = 3.5 / sets; // Research average ~3.5 sets per match
    
    return {
        kills: stats.totalKills * normalizationFactor,
        errors: stats.attackErrors * normalizationFactor,
        attempts: stats.killAttempts * normalizationFactor,
        serviceAces: stats.serviceAces * normalizationFactor,
        serviceErrors: stats.serviceErrors * normalizationFactor,
        receptionErrors: stats.receptionErrors * normalizationFactor,
        digs: stats.digs * normalizationFactor,
        soloBlocks: stats.soloBlocks * normalizationFactor,
        blockAssists: stats.blockAssists * normalizationFactor
    };
}

/**
 * Calculate impact of each metric using odds ratios
 * Returns percentage point impact on win probability
 */
function calculateImpacts(normalizedStats) {
    const impacts = {};
    const midpoint = RESEARCH_BENCHMARKS.win; // Use winning average as baseline
    
    // Calculate log odds impact for each metric
    for (let metric in ODDS_RATIOS) {
        if (normalizedStats[metric] !== undefined && midpoint[metric] !== undefined) {
            const deviation = normalizedStats[metric] - midpoint[metric];
            const logOddsChange = deviation * Math.log(ODDS_RATIOS[metric]);
            
            // Convert log odds to approximate percentage points
            // This is a simplified conversion for interpretability
            const percentageImpact = logOddsChange * 100 / Math.log(2);
            
            impacts[metric] = {
                value: normalizedStats[metric],
                benchmark: midpoint[metric],
                deviation: deviation,
                impact: percentageImpact,
                oddsRatio: ODDS_RATIOS[metric]
            };
        }
    }
    
    return impacts;
}

/**
 * Determine performance level vs benchmarks
 */
function getPerformanceLevel(value, metric) {
    const winBench = RESEARCH_BENCHMARKS.win[metric];
    const lossBench = RESEARCH_BENCHMARKS.loss[metric];
    
    // For metrics where lower is better (errors, attempts)
    const lowerIsBetter = ['errors', 'attempts', 'serviceErrors', 'receptionErrors', 'blockErrors'];
    
    if (lowerIsBetter.includes(metric)) {
        if (value <= winBench) return 'excellent';
        if (value <= lossBench) return 'good';
        return 'needs_improvement';
    } else {
        // For metrics where higher is better
        if (value >= winBench) return 'excellent';
        if (value >= lossBench) return 'good';
        return 'needs_improvement';
    }
}

/**
 * Generate prioritized practice recommendations
 */
function generateRecommendations(impacts) {
    const recommendations = [];
    
    // Sort by absolute impact (biggest problems and biggest strengths)
    const sortedImpacts = Object.entries(impacts)
        .sort((a, b) => Math.abs(b[1].impact) - Math.abs(a[1].impact));
    
    // Identify top 3 weaknesses (negative impacts)
    const weaknesses = sortedImpacts
        .filter(([_, data]) => data.impact < -1) // Significant negative impact
        .slice(0, 3);
    
    // Identify top 2 strengths (positive impacts)
    const strengths = sortedImpacts
        .filter(([_, data]) => data.impact > 1) // Significant positive impact
        .slice(0, 2);
    
    return {
        weaknesses: weaknesses.map(([metric, data]) => ({
            metric,
            impact: data.impact,
            value: data.value,
            benchmark: data.benchmark,
            priority: Math.abs(data.impact)
        })),
        strengths: strengths.map(([metric, data]) => ({
            metric,
            impact: data.impact,
            value: data.value,
            benchmark: data.benchmark
        })),
        allImpacts: sortedImpacts
    };
}

/**
 * Format metric names for display
 */
function formatMetricName(metric) {
    const names = {
        kills: 'Kills',
        errors: 'Attack Errors',
        attempts: 'Attack Attempts',
        serviceAces: 'Service Aces',
        serviceErrors: 'Service Errors',
        receptionErrors: 'Reception Errors',
        digs: 'Digs',
        soloBlocks: 'Solo Blocks',
        blockAssists: 'Block Assists',
        blockErrors: 'Block Errors'
    };
    return names[metric] || metric;
}

/**
 * Generate human-readable insights text
 */
function generateInsightsText(stats, impacts, recommendations) {
    let insights = [];
    
    // Header
    insights.push('**Performance Analysis Based on NCAA Research**\n');
    
    // Overall summary
    const totalImpact = Object.values(impacts).reduce((sum, i) => sum + i.impact, 0);
    if (totalImpact > 5) {
        insights.push('Your statistics profile suggests strong performance aligned with winning teams from NCAA Division I research.\n');
    } else if (totalImpact < -5) {
        insights.push('Your statistics profile shows several areas below winning benchmarks. Focus on the priorities below for maximum improvement.\n');
    } else {
        insights.push('Your statistics show a mixed profile with both strengths and areas for improvement.\n');
    }
    
    // Top Priorities (Weaknesses)
    if (recommendations.weaknesses.length > 0) {
        insights.push('**🎯 Top Practice Priorities**\n');
        
        recommendations.weaknesses.forEach((weakness, index) => {
            const metricName = formatMetricName(weakness.metric);
            const impactPercent = Math.abs(weakness.impact).toFixed(1);
            const orValue = ODDS_RATIOS[weakness.metric];
            const orPercent = Math.abs((1 - orValue) * 100).toFixed(1);
            
            insights.push(`**Priority ${index + 1}: ${metricName}**`);
            insights.push(`Your ${weakness.value.toFixed(1)} vs winning average of ${weakness.benchmark.toFixed(1)}`);
            insights.push(`Impact: ${impactPercent}% reduction in win probability`);
            insights.push(`Research shows each ${metricName.toLowerCase()} changes win odds by ${orPercent}%\n`);
        });
    }
    
    // Strengths
    if (recommendations.strengths.length > 0) {
        insights.push('**✅ Areas of Strength**\n');
        
        recommendations.strengths.forEach(strength => {
            const metricName = formatMetricName(strength.metric);
            const impactPercent = strength.impact.toFixed(1);
            
            insights.push(`**${metricName}:** ${strength.value.toFixed(1)} (winning avg: ${strength.benchmark.toFixed(1)})`);
            insights.push(`Contributing +${impactPercent}% to win probability\n`);
        });
    }
    
    // Key research insights
    insights.push('**📊 Key Research Findings**\n');
    insights.push('• Service aces have the strongest positive impact (+33.8% per ace)');
    insights.push('• Reception errors have the strongest negative impact (-24.3% per error)');
    insights.push('• More attack attempts actually hurt performance - efficiency over volume');
    insights.push('• Both solo blocks and block assists significantly improve win probability\n');
    
    // Specific actionable recommendations
    insights.push('**🏐 Recommended Practice Focus**\n');
    
    if (recommendations.weaknesses.length > 0) {
        const topWeakness = recommendations.weaknesses[0];
        
        if (topWeakness.metric === 'receptionErrors') {
            insights.push('• Serve-receive drills with pressure situations');
            insights.push('• Individual passing technique work');
            insights.push('• Communication and coverage patterns');
        } else if (topWeakness.metric === 'serviceAces') {
            insights.push('• Aggressive serving practice with target zones');
            insights.push('• Risk/reward analysis for different serve types');
            insights.push('• Situational serving strategy');
        } else if (topWeakness.metric === 'attempts') {
            insights.push('• Shot selection and decision-making drills');
            insights.push('• High-percentage attack patterns');
            insights.push('• Reading defense and picking spots');
        } else if (topWeakness.metric === 'errors') {
            insights.push('• Ball control and technique refinement');
            insights.push('• Reduce unforced errors through focused repetition');
            insights.push('• Mental approach to minimize mistakes');
        } else if (topWeakness.metric === 'digs') {
            insights.push('• Defensive positioning and reading hitters');
            insights.push('• Platform control and emergency digs');
            insights.push('• Transition from defense to offense');
        } else if (topWeakness.metric.includes('Block')) {
            insights.push('• Blocking footwork and timing');
            insights.push('• Reading opponent tendencies');
            insights.push('• Team blocking coordination');
        }
    }
    
    return insights.join('\n');
}

/**
 * Main analysis function
 * Takes raw game stats and returns complete analysis
 */
function analyzeGame(stats) {
    // Normalize stats to match research scale
    const normalized = normalizeStats(stats, stats.totalSets || 3);
    
    // Calculate impacts using odds ratios
    const impacts = calculateImpacts(normalized);
    
    // Generate recommendations
    const recommendations = generateRecommendations(impacts);
    
    // Generate insights text
    const insightsText = generateInsightsText(stats, impacts, recommendations);
    
    // Calculate basic metrics for display
    const metrics = {
        killEfficiency: stats.killAttempts > 0 ? (stats.totalKills / stats.killAttempts * 100) : 0,
        acesPerSet: stats.totalSets > 0 ? (stats.serviceAces / stats.totalSets) : 0,
        blocksPerSet: stats.totalSets > 0 ? ((stats.soloBlocks + stats.blockAssists) / stats.totalSets) : 0,
        digsPerSet: stats.totalSets > 0 ? (stats.digs / stats.totalSets) : 0,
        receptionErrorRate: stats.totalSets > 0 ? (stats.receptionErrors / stats.totalSets) : 0,
        attackErrorRate: stats.totalSets > 0 ? (stats.attackErrors / stats.totalSets) : 0
    };
    
    return {
        normalized,
        impacts,
        recommendations,
        insightsText,
        metrics
    };
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { analyzeGame, RESEARCH_BENCHMARKS, ODDS_RATIOS };
}
