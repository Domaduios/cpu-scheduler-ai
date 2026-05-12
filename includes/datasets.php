<?php
/**
 * Datasets Manager
 * ================
 *
 * Loads test datasets from the MySQL database.
 * Falls back to hardcoded datasets if the DB isn't available
 * (so the project still works even without MySQL setup).
 */
require_once __DIR__ . '/db_config.php';
class Datasets {
    /**
     * Get a single dataset by its slug ("classic", "convoy", etc.)
     */
    public static function getDataset($name) {
        if ($name === 'random') {
            return self::generateRandom();
        }
        // Try DB first
        $fromDb = self::loadFromDatabase($name);
        if ($fromDb !== null) {
            return $fromDb;
        }
        // Fallback to hardcoded if DB not available
        return self::getHardcodedDataset($name);
    }
    /**
     * Load a dataset from the database.
     * Returns null if not found or DB unavailable.
     */
    private static function loadFromDatabase($slug) {
        $pdo = getDbConnection();
        if ($pdo === null) return null;
        try {
            // Get the dataset metadata
            $stmt = $pdo->prepare(
                "SELECT id, name, description FROM datasets WHERE slug = ?"
            );
            $stmt->execute([$slug]);
            $dataset = $stmt->fetch();
            if (!$dataset) return null;
            // Get the processes for this dataset
            $stmt = $pdo->prepare(
                "SELECT pid, arrival, burst, priority 
                 FROM dataset_processes 
                 WHERE dataset_id = ? 
                 ORDER BY process_order"
            );
            $stmt->execute([$dataset['id']]);
            $processes = [];
            while ($row = $stmt->fetch()) {
                $proc = [
                    'pid' => $row['pid'],
                    'arrival' => (int)$row['arrival'],
                    'burst' => (int)$row['burst'],
                ];
                if ($row['priority'] !== null) {
                    $proc['priority'] = (int)$row['priority'];
                }
                $processes[] = $proc;
            }
            return [
                'name' => $dataset['name'],
                'description' => $dataset['description'],
                'processes' => $processes,
                'source' => 'database'
            ];
        } catch (PDOException $e) {
            error_log('Dataset query failed: ' . $e->getMessage());
            return null;
        }
    }
    /**
     * Hardcoded datasets - used as a fallback if MySQL isn't set up.
     * These mirror what's in setup.sql exactly.
     */
    private static function getHardcodedDataset($name) {
        $datasets = [
            'classic' => [
                'name' => 'Classic Textbook Example',
                'description' => 'Standard OS textbook scenario - 4 processes with mixed burst times',
                'processes' => [
                    ['pid' => 'P1', 'arrival' => 0, 'burst' => 6, 'priority' => 2],
                    ['pid' => 'P2', 'arrival' => 1, 'burst' => 8, 'priority' => 1],
                    ['pid' => 'P3', 'arrival' => 2, 'burst' => 7, 'priority' => 3],
                    ['pid' => 'P4', 'arrival' => 3, 'burst' => 3, 'priority' => 4],
                ]
            ],
            'convoy' => [
                'name' => 'Convoy Effect Demo',
                'description' => 'Tests FCFS weakness - one long process blocks short ones',
                'processes' => [
                    ['pid' => 'P1', 'arrival' => 0, 'burst' => 20, 'priority' => 3],
                    ['pid' => 'P2', 'arrival' => 1, 'burst' => 2, 'priority' => 1],
                    ['pid' => 'P3', 'arrival' => 2, 'burst' => 3, 'priority' => 2],
                    ['pid' => 'P4', 'arrival' => 3, 'burst' => 1, 'priority' => 1],
                    ['pid' => 'P5', 'arrival' => 4, 'burst' => 4, 'priority' => 2],
                ]
            ],
            'uniform' => [
                'name' => 'Uniform Workload',
                'description' => 'Similar burst times - tests Round Robin advantage',
                'processes' => [
                    ['pid' => 'P1', 'arrival' => 0, 'burst' => 5, 'priority' => 1],
                    ['pid' => 'P2', 'arrival' => 1, 'burst' => 5, 'priority' => 2],
                    ['pid' => 'P3', 'arrival' => 2, 'burst' => 6, 'priority' => 3],
                    ['pid' => 'P4', 'arrival' => 3, 'burst' => 5, 'priority' => 1],
                    ['pid' => 'P5', 'arrival' => 4, 'burst' => 4, 'priority' => 2],
                ]
            ],
            'priority' => [
                'name' => 'Priority-driven Scenario',
                'description' => 'Mixed priorities - tests priority algorithms strength',
                'processes' => [
                    ['pid' => 'P1', 'arrival' => 0, 'burst' => 10, 'priority' => 3],
                    ['pid' => 'P2', 'arrival' => 2, 'burst' => 5, 'priority' => 1],
                    ['pid' => 'P3', 'arrival' => 4, 'burst' => 2, 'priority' => 4],
                    ['pid' => 'P4', 'arrival' => 6, 'burst' => 8, 'priority' => 2],
                ]
            ],
        ];
        $data = $datasets[$name] ?? $datasets['classic'];
        $data['source'] = 'hardcoded';
        return $data;
    }
    /**
     * Generate a random dataset on the fly.
     */
    public static function generateRandom($count = null) {
        if ($count === null) {
            $count = rand(4, 7);
        }
        $processes = [];
        $arrival = 0;
        for ($i = 1; $i <= $count; $i++) {
            $processes[] = [
                'pid' => "P$i",
                'arrival' => $arrival,
                'burst' => rand(2, 12),
                'priority' => rand(1, 5)
            ];
            $arrival += rand(0, 3);
        }
        return [
            'name' => 'Random Dataset',
            'description' => "Auto-generated $count processes with random arrivals and bursts",
            'processes' => $processes,
            'source' => 'generator'
        ];
    }
    /**
     * Save a simulation result to history (bonus feature).
     */
    public static function saveSimulationHistory($workloadType, $processCount, $recommended, $metrics) {
        $pdo = getDbConnection();
        if ($pdo === null) return false;
        try {
            $stmt = $pdo->prepare(
                "INSERT INTO simulation_history 
                 (workload_type, process_count, recommended_algorithm, 
                  avg_waiting, avg_turnaround, throughput, fairness)
                 VALUES (?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $workloadType,
                $processCount,
                $recommended,
                $metrics['avg_waiting'],
                $metrics['avg_turnaround'],
                $metrics['throughput'],
                $metrics['fairness']
            ]);
            return true;
        } catch (PDOException $e) {
            error_log('Failed to save history: ' . $e->getMessage());
            return false;
        }
    }
}