<?php
/**
 * CPU Scheduling Algorithms
 * Project: OS + Computer Graphics + AI Recommendation System
 * 
 * Implements 6 algorithms with full metrics
 */

class SchedulingAlgorithms {
    
    public static function FCFS($processes) {
        usort($processes, fn($a, $b) => $a['arrival'] - $b['arrival']);
        
        $currentTime = 0;
        $gantt = [];
        $results = [];
        
        foreach ($processes as $p) {
            if ($currentTime < $p['arrival']) {
                $gantt[] = ['pid' => 'IDLE', 'start' => $currentTime, 'end' => $p['arrival']];
                $currentTime = $p['arrival'];
            }
            
            $start = $currentTime;
            $end = $currentTime + $p['burst'];
            
            $gantt[] = ['pid' => $p['pid'], 'start' => $start, 'end' => $end];
            
            $results[] = [
                'pid' => $p['pid'],
                'arrival' => $p['arrival'],
                'burst' => $p['burst'],
                'priority' => $p['priority'] ?? null,
                'completion' => $end,
                'turnaround' => $end - $p['arrival'],
                'waiting' => $end - $p['arrival'] - $p['burst'],
                'response' => $start - $p['arrival']
            ];
            
            $currentTime = $end;
        }
        
        return ['gantt' => $gantt, 'processes' => $results, 'metrics' => self::calculateMetrics($results, $currentTime)];
    }
    
    public static function SJF($processes) {
        $n = count($processes);
        $remaining = $processes;
        $currentTime = 0;
        $gantt = [];
        $results = [];
        
        while (count($results) < $n) {
            $available = array_filter($remaining, fn($p) => $p['arrival'] <= $currentTime);
            
            if (empty($available)) {
                $nextArrival = min(array_column($remaining, 'arrival'));
                $gantt[] = ['pid' => 'IDLE', 'start' => $currentTime, 'end' => $nextArrival];
                $currentTime = $nextArrival;
                continue;
            }
            
            usort($available, fn($a, $b) => $a['burst'] - $b['burst']);
            $selected = $available[0];
            
            $start = $currentTime;
            $end = $currentTime + $selected['burst'];
            
            $gantt[] = ['pid' => $selected['pid'], 'start' => $start, 'end' => $end];
            
            $results[] = [
                'pid' => $selected['pid'],
                'arrival' => $selected['arrival'],
                'burst' => $selected['burst'],
                'priority' => $selected['priority'] ?? null,
                'completion' => $end,
                'turnaround' => $end - $selected['arrival'],
                'waiting' => $end - $selected['arrival'] - $selected['burst'],
                'response' => $start - $selected['arrival']
            ];
            
            $currentTime = $end;
            $remaining = array_filter($remaining, fn($p) => $p['pid'] !== $selected['pid']);
        }
        
        return ['gantt' => $gantt, 'processes' => $results, 'metrics' => self::calculateMetrics($results, $currentTime)];
    }
    
    public static function SRTF($processes) {
        $n = count($processes);
        $remaining = [];
        $startTime = [];
        $procMap = [];
        
        foreach ($processes as $p) {
            $remaining[$p['pid']] = $p['burst'];
            $startTime[$p['pid']] = -1;
            $procMap[$p['pid']] = $p;
        }
        
        $currentTime = 0;
        $completed = 0;
        $gantt = [];
        $completionTime = [];
        $lastPid = null;
        $segmentStart = 0;
        
        while ($completed < $n) {
            $shortest = null;
            $minRemaining = PHP_INT_MAX;
            
            foreach ($processes as $p) {
                if ($p['arrival'] <= $currentTime && $remaining[$p['pid']] > 0) {
                    if ($remaining[$p['pid']] < $minRemaining) {
                        $minRemaining = $remaining[$p['pid']];
                        $shortest = $p;
                    }
                }
            }
            
            if ($shortest === null) {
                if ($lastPid !== null && $lastPid !== 'IDLE') {
                    $gantt[] = ['pid' => $lastPid, 'start' => $segmentStart, 'end' => $currentTime];
                    $segmentStart = $currentTime;
                }
                $lastPid = 'IDLE';
                $currentTime++;
                continue;
            }
            
            if ($startTime[$shortest['pid']] === -1) {
                $startTime[$shortest['pid']] = $currentTime;
            }
            
            if ($lastPid !== $shortest['pid']) {
                if ($lastPid !== null) {
                    $gantt[] = ['pid' => $lastPid, 'start' => $segmentStart, 'end' => $currentTime];
                }
                $segmentStart = $currentTime;
                $lastPid = $shortest['pid'];
            }
            
            $remaining[$shortest['pid']]--;
            $currentTime++;
            
            if ($remaining[$shortest['pid']] === 0) {
                $completed++;
                $completionTime[$shortest['pid']] = $currentTime;
            }
        }
        
        if ($lastPid !== null) {
            $gantt[] = ['pid' => $lastPid, 'start' => $segmentStart, 'end' => $currentTime];
        }
        
        $results = [];
        foreach ($processes as $p) {
            $results[] = [
                'pid' => $p['pid'],
                'arrival' => $p['arrival'],
                'burst' => $p['burst'],
                'priority' => $p['priority'] ?? null,
                'completion' => $completionTime[$p['pid']],
                'turnaround' => $completionTime[$p['pid']] - $p['arrival'],
                'waiting' => $completionTime[$p['pid']] - $p['arrival'] - $p['burst'],
                'response' => $startTime[$p['pid']] - $p['arrival']
            ];
        }
        
        return ['gantt' => $gantt, 'processes' => $results, 'metrics' => self::calculateMetrics($results, $currentTime)];
    }
    
    public static function RR($processes, $quantum = 2) {
        $n = count($processes);
        $remaining = [];
        $firstResponse = [];
        $procMap = [];
        
        foreach ($processes as $p) {
            $remaining[$p['pid']] = $p['burst'];
            $firstResponse[$p['pid']] = -1;
            $procMap[$p['pid']] = $p;
        }
        
        $sorted = $processes;
        usort($sorted, fn($a, $b) => $a['arrival'] - $b['arrival']);
        
        $currentTime = $sorted[0]['arrival'];
        $gantt = [];
        $completionTime = [];
        $queue = [$sorted[0]['pid']];
        $arrived = [$sorted[0]['pid'] => true];
        
        while (!empty($queue)) {
            $currentPid = array_shift($queue);
            $current = $procMap[$currentPid];
            
            if ($firstResponse[$currentPid] === -1) {
                $firstResponse[$currentPid] = $currentTime;
            }
            
            $executeTime = min($quantum, $remaining[$currentPid]);
            $startExec = $currentTime;
            $endExec = $currentTime + $executeTime;
            
            $gantt[] = ['pid' => $currentPid, 'start' => $startExec, 'end' => $endExec];
            
            $remaining[$currentPid] -= $executeTime;
            $currentTime = $endExec;
            
            // Check for newly arrived processes
            foreach ($processes as $p) {
                if (!isset($arrived[$p['pid']]) && $p['arrival'] <= $currentTime) {
                    $queue[] = $p['pid'];
                    $arrived[$p['pid']] = true;
                }
            }
            
            if ($remaining[$currentPid] > 0) {
                $queue[] = $currentPid;
            } else {
                $completionTime[$currentPid] = $currentTime;
            }
            
            // Handle CPU idle if queue empty but processes remain
            if (empty($queue)) {
                $nextProc = null;
                $nextArrival = PHP_INT_MAX;
                foreach ($processes as $p) {
                    if (!isset($arrived[$p['pid']]) && $p['arrival'] < $nextArrival) {
                        $nextArrival = $p['arrival'];
                        $nextProc = $p['pid'];
                    }
                }
                if ($nextProc !== null) {
                    $gantt[] = ['pid' => 'IDLE', 'start' => $currentTime, 'end' => $nextArrival];
                    $currentTime = $nextArrival;
                    $queue[] = $nextProc;
                    $arrived[$nextProc] = true;
                }
            }
        }
        
        $results = [];
        foreach ($processes as $p) {
            $results[] = [
                'pid' => $p['pid'],
                'arrival' => $p['arrival'],
                'burst' => $p['burst'],
                'priority' => $p['priority'] ?? null,
                'completion' => $completionTime[$p['pid']],
                'turnaround' => $completionTime[$p['pid']] - $p['arrival'],
                'waiting' => $completionTime[$p['pid']] - $p['arrival'] - $p['burst'],
                'response' => $firstResponse[$p['pid']] - $p['arrival']
            ];
        }
        
        return ['gantt' => $gantt, 'processes' => $results, 'metrics' => self::calculateMetrics($results, $currentTime), 'quantum' => $quantum];
    }
    
    public static function PriorityNP($processes) {
        $n = count($processes);
        $remaining = $processes;
        $currentTime = 0;
        $gantt = [];
        $results = [];
        
        while (count($results) < $n) {
            $available = array_filter($remaining, fn($p) => $p['arrival'] <= $currentTime);
            
            if (empty($available)) {
                $nextArrival = min(array_column($remaining, 'arrival'));
                $gantt[] = ['pid' => 'IDLE', 'start' => $currentTime, 'end' => $nextArrival];
                $currentTime = $nextArrival;
                continue;
            }
            
            usort($available, fn($a, $b) => $a['priority'] - $b['priority']);
            $selected = $available[0];
            
            $start = $currentTime;
            $end = $currentTime + $selected['burst'];
            
            $gantt[] = ['pid' => $selected['pid'], 'start' => $start, 'end' => $end];
            
            $results[] = [
                'pid' => $selected['pid'],
                'arrival' => $selected['arrival'],
                'burst' => $selected['burst'],
                'priority' => $selected['priority'],
                'completion' => $end,
                'turnaround' => $end - $selected['arrival'],
                'waiting' => $end - $selected['arrival'] - $selected['burst'],
                'response' => $start - $selected['arrival']
            ];
            
            $currentTime = $end;
            $remaining = array_filter($remaining, fn($p) => $p['pid'] !== $selected['pid']);
        }
        
        return ['gantt' => $gantt, 'processes' => $results, 'metrics' => self::calculateMetrics($results, $currentTime)];
    }
    
    public static function PriorityP($processes) {
        $n = count($processes);
        $remaining = [];
        $startTime = [];
        
        foreach ($processes as $p) {
            $remaining[$p['pid']] = $p['burst'];
            $startTime[$p['pid']] = -1;
        }
        
        $currentTime = 0;
        $completed = 0;
        $gantt = [];
        $completionTime = [];
        $lastPid = null;
        $segmentStart = 0;
        
        while ($completed < $n) {
            $highest = null;
            $minPriority = PHP_INT_MAX;
            
            foreach ($processes as $p) {
                if ($p['arrival'] <= $currentTime && $remaining[$p['pid']] > 0) {
                    if ($p['priority'] < $minPriority) {
                        $minPriority = $p['priority'];
                        $highest = $p;
                    }
                }
            }
            
            if ($highest === null) {
                if ($lastPid !== null && $lastPid !== 'IDLE') {
                    $gantt[] = ['pid' => $lastPid, 'start' => $segmentStart, 'end' => $currentTime];
                    $segmentStart = $currentTime;
                }
                $lastPid = 'IDLE';
                $currentTime++;
                continue;
            }
            
            if ($startTime[$highest['pid']] === -1) {
                $startTime[$highest['pid']] = $currentTime;
            }
            
            if ($lastPid !== $highest['pid']) {
                if ($lastPid !== null) {
                    $gantt[] = ['pid' => $lastPid, 'start' => $segmentStart, 'end' => $currentTime];
                }
                $segmentStart = $currentTime;
                $lastPid = $highest['pid'];
            }
            
            $remaining[$highest['pid']]--;
            $currentTime++;
            
            if ($remaining[$highest['pid']] === 0) {
                $completed++;
                $completionTime[$highest['pid']] = $currentTime;
            }
        }
        
        if ($lastPid !== null) {
            $gantt[] = ['pid' => $lastPid, 'start' => $segmentStart, 'end' => $currentTime];
        }
        
        $results = [];
        foreach ($processes as $p) {
            $results[] = [
                'pid' => $p['pid'],
                'arrival' => $p['arrival'],
                'burst' => $p['burst'],
                'priority' => $p['priority'],
                'completion' => $completionTime[$p['pid']],
                'turnaround' => $completionTime[$p['pid']] - $p['arrival'],
                'waiting' => $completionTime[$p['pid']] - $p['arrival'] - $p['burst'],
                'response' => $startTime[$p['pid']] - $p['arrival']
            ];
        }
        
        return ['gantt' => $gantt, 'processes' => $results, 'metrics' => self::calculateMetrics($results, $currentTime)];
    }
    
    /**
     * Calculate all metrics including Fairness
     * Fairness = how evenly waiting times are distributed (lower std dev = more fair)
     */
    private static function calculateMetrics($results, $totalTime) {
        $n = count($results);
        $sumWaiting = 0;
        $sumTurnaround = 0;
        $sumResponse = 0;
        $sumBurst = 0;
        $waitingTimes = [];
        
        foreach ($results as $r) {
            $sumWaiting += $r['waiting'];
            $sumTurnaround += $r['turnaround'];
            $sumResponse += $r['response'];
            $sumBurst += $r['burst'];
            $waitingTimes[] = $r['waiting'];
        }
        
        $avgWaiting = $sumWaiting / $n;
        
        // Fairness: based on standard deviation of waiting times
        // Lower std dev = more fair (closer to 100%)
        $variance = 0;
        foreach ($waitingTimes as $w) {
            $variance += pow($w - $avgWaiting, 2);
        }
        $stdDev = ($n > 0) ? sqrt($variance / $n) : 0;
        
        // Convert to fairness percentage (max possible variation = avg waiting)
        $fairness = ($avgWaiting > 0) ? max(0, 100 - ($stdDev / $avgWaiting * 100)) : 100;
        
        return [
            'avg_waiting' => round($avgWaiting, 2),
            'avg_turnaround' => round($sumTurnaround / $n, 2),
            'avg_response' => round($sumResponse / $n, 2),
            'throughput' => round($n / $totalTime, 3),
            'cpu_utilization' => round(($sumBurst / $totalTime) * 100, 2),
            'fairness' => round($fairness, 2),
            'total_time' => $totalTime
        ];
    }
}
