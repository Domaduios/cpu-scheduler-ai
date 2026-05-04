<?php
/**
 * AI Recommendation Engine - Real Decision Engine
 * Multi-criteria scoring: Performance + Rules + Fairness
 */

class AIRecommender {
    
    public static function recommend($processes, $allResults) {
        $analysis = self::analyzeWorkload($processes);
        $scores = self::scoreAlgorithms($analysis, $allResults);
        $reasoning = self::generateReasoning($analysis, $allResults);
        
        arsort($scores);
        $winner = array_key_first($scores);
        
        return [
            'workload_analysis' => $analysis,
            'scores' => $scores,
            'reasoning' => $reasoning,
            'recommended' => $winner,
            'recommendation_summary' => self::buildSummary($winner, $analysis, $allResults[$winner])
        ];
    }
    
    private static function analyzeWorkload($processes) {
        $n = count($processes);
        $bursts = array_column($processes, 'burst');
        $arrivals = array_column($processes, 'arrival');
        
        $avgBurst = array_sum($bursts) / $n;
        $maxBurst = max($bursts);
        $minBurst = min($bursts);
        
        $variance = 0;
        foreach ($bursts as $b) {
            $variance += pow($b - $avgBurst, 2);
        }
        $stdDev = sqrt($variance / $n);
        $burstVariation = ($avgBurst > 0) ? ($stdDev / $avgBurst) : 0;
        
        $sameArrival = (count(array_unique($arrivals)) === 1);
        $hasPriority = isset($processes[0]['priority']);
        
        return [
            'process_count' => $n,
            'avg_burst' => round($avgBurst, 2),
            'max_burst' => $maxBurst,
            'min_burst' => $minBurst,
            'std_deviation' => round($stdDev, 2),
            'burst_variation' => round($burstVariation, 3),
            'same_arrival' => $sameArrival,
            'has_priority' => $hasPriority,
            'workload_type' => self::classifyWorkload($burstVariation),
            'is_uniform' => $burstVariation < 0.3,
            'is_mixed' => $burstVariation >= 0.3 && $burstVariation < 0.7,
            'is_diverse' => $burstVariation >= 0.7
        ];
    }
    
    private static function classifyWorkload($variation) {
        if ($variation < 0.3) return 'Uniform';
        if ($variation < 0.7) return 'Mixed';
        return 'Diverse';
    }
    
    /**
     * Multi-criteria scoring system
     * Total: 100 points across 4 categories
     */
    private static function scoreAlgorithms($analysis, $allResults) {
        $scores = [];
        
        // Get min/max for normalization
        $waiting = array_column(array_column($allResults, 'metrics'), 'avg_waiting');
        $turnaround = array_column(array_column($allResults, 'metrics'), 'avg_turnaround');
        $response = array_column(array_column($allResults, 'metrics'), 'avg_response');
        $throughput = array_column(array_column($allResults, 'metrics'), 'throughput');
        $fairness = array_column(array_column($allResults, 'metrics'), 'fairness');
        
        $minW = min($waiting); $maxW = max($waiting);
        $minT = min($turnaround); $maxT = max($turnaround);
        $minR = min($response); $maxR = max($response);
        $maxThr = max($throughput);
        $maxF = max($fairness);
        
        foreach ($allResults as $name => $result) {
            $m = $result['metrics'];
            $score = 0;
            
            // === Waiting Time (25 points) ===
            $score += ($maxW > $minW) ? 25 * (1 - ($m['avg_waiting'] - $minW) / ($maxW - $minW)) : 25;
            
            // === Turnaround (15 points) ===
            $score += ($maxT > $minT) ? 15 * (1 - ($m['avg_turnaround'] - $minT) / ($maxT - $minT)) : 15;
            
            // === Throughput (10 points) ===
            $score += ($maxThr > 0) ? 10 * ($m['throughput'] / $maxThr) : 0;
            
            // === Fairness (10 points) ===
            $score += ($maxF > 0) ? 10 * ($m['fairness'] / $maxF) : 0;
            
            // === Rule-based bonus (40 points) ===
            $score += self::applyRules($name, $analysis);
            
            $scores[$name] = round($score, 2);
        }
        
        return $scores;
    }
    
    private static function applyRules($algo, $a) {
        $bonus = 0;
        
        switch ($algo) {
            case 'FCFS':
                if ($a['is_uniform']) $bonus += 15;
                if ($a['is_diverse']) $bonus -= 10;
                if (!$a['same_arrival']) $bonus += 10;
                $bonus += 5; // simplicity bonus
                break;
                
            case 'SJF':
                if ($a['is_diverse']) $bonus += 25;
                elseif ($a['is_mixed']) $bonus += 18;
                else $bonus += 8;
                $bonus += 10; // optimal waiting time
                if ($a['process_count'] > 6 && $a['is_diverse']) $bonus -= 5;
                break;
                
            case 'SRTF':
                if ($a['is_diverse']) $bonus += 22;
                elseif ($a['is_mixed']) $bonus += 18;
                else $bonus += 10;
                if (!$a['same_arrival']) $bonus += 12;
                if ($a['process_count'] > 6) $bonus -= 5;
                break;
                
            case 'RR':
                if ($a['is_uniform']) $bonus += 25;
                elseif ($a['is_mixed']) $bonus += 15;
                else $bonus += 8;
                $bonus += 12; // best response time + no starvation
                break;
                
            case 'Priority_NP':
                if ($a['has_priority']) {
                    $bonus += 20;
                    if ($a['is_uniform']) $bonus += 8;
                    if ($a['process_count'] > 5) $bonus -= 5;
                } else {
                    $bonus -= 30;
                }
                break;
                
            case 'Priority_P':
                if ($a['has_priority']) {
                    $bonus += 22;
                    if ($a['is_diverse']) $bonus += 8;
                    if ($a['process_count'] > 5) $bonus -= 3;
                } else {
                    $bonus -= 30;
                }
                break;
        }
        
        return max(0, min(40, $bonus));
    }
    
    private static function generateReasoning($analysis, $allResults) {
        $reasoning = [];
        
        foreach ($allResults as $algo => $result) {
            $points = [];
            $m = $result['metrics'];
            
            switch ($algo) {
                case 'FCFS':
                    if ($analysis['is_diverse']) {
                        $points[] = ['type' => 'warning', 'text' => 'Convoy effect: long process delays short ones'];
                    } else {
                        $points[] = ['type' => 'success', 'text' => 'Fair execution order, predictable timing'];
                    }
                    $points[] = ['type' => 'info', 'text' => 'Simple to implement, low overhead'];
                    break;
                    
                case 'SJF':
                    $points[] = ['type' => 'success', 'text' => 'Optimal for minimizing waiting time (theoretically proven)'];
                    if ($analysis['is_diverse']) {
                        $points[] = ['type' => 'success', 'text' => 'Excellent fit for diverse burst times'];
                    }
                    if ($analysis['process_count'] > 5) {
                        $points[] = ['type' => 'warning', 'text' => 'Long processes may face starvation'];
                    }
                    break;
                    
                case 'SRTF':
                    $points[] = ['type' => 'success', 'text' => 'Best theoretical waiting time (preemptive optimization)'];
                    if (!$analysis['same_arrival']) {
                        $points[] = ['type' => 'success', 'text' => 'Adapts efficiently to new arrivals'];
                    }
                    $points[] = ['type' => 'warning', 'text' => 'Higher context-switching overhead'];
                    break;
                    
                case 'RR':
                    $q = $result['quantum'] ?? 2;
                    $points[] = ['type' => 'info', 'text' => "Time quantum: {$q} units"];
                    $points[] = ['type' => 'success', 'text' => 'Fair to all processes, no starvation'];
                    if ($analysis['is_uniform']) {
                        $points[] = ['type' => 'success', 'text' => 'Ideal for uniform workload'];
                    }
                    $points[] = ['type' => 'success', 'text' => 'Excellent response time for interactive systems'];
                    break;
                    
                case 'Priority_NP':
                    if ($analysis['has_priority']) {
                        $points[] = ['type' => 'success', 'text' => 'Respects user-defined priorities'];
                        $points[] = ['type' => 'warning', 'text' => 'Risk of low-priority starvation'];
                    } else {
                        $points[] = ['type' => 'error', 'text' => 'No priorities defined - not applicable'];
                    }
                    break;
                    
                case 'Priority_P':
                    if ($analysis['has_priority']) {
                        $points[] = ['type' => 'success', 'text' => 'Immediate response for high-priority tasks'];
                        $points[] = ['type' => 'success', 'text' => 'Suitable for real-time systems'];
                        $points[] = ['type' => 'warning', 'text' => 'Higher context-switching overhead'];
                    } else {
                        $points[] = ['type' => 'error', 'text' => 'No priorities defined - not applicable'];
                    }
                    break;
            }
            
            $reasoning[$algo] = $points;
        }
        
        return $reasoning;
    }
    
    private static function buildSummary($winner, $analysis, $winnerResult) {
        $names = [
            'FCFS' => 'First Come First Serve',
            'SJF' => 'Shortest Job First',
            'SRTF' => 'Shortest Remaining Time First',
            'RR' => 'Round Robin',
            'Priority_NP' => 'Priority (Non-preemptive)',
            'Priority_P' => 'Priority (Preemptive)'
        ];
        
        return "Based on a {$analysis['workload_type']} workload of {$analysis['process_count']} processes " .
               "(burst variation: {$analysis['burst_variation']}), **{$names[$winner]}** is the optimal choice. " .
               "It achieves the best balance with waiting time of {$winnerResult['metrics']['avg_waiting']} units, " .
               "throughput of {$winnerResult['metrics']['throughput']}, and fairness score of {$winnerResult['metrics']['fairness']}%.";
    }
}
