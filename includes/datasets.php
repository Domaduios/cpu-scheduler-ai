<?php
/**
 * Dataset System
 * 3 predefined test cases + Random generator
 */

class Datasets {
    
    public static function getDataset($name) {
        switch ($name) {
            case 'classic':
                return [
                    'name' => 'Classic Textbook Example',
                    'description' => 'Standard OS textbook scenario - 4 processes with mixed burst times',
                    'processes' => [
                        ['pid' => 'P1', 'arrival' => 0, 'burst' => 6, 'priority' => 2],
                        ['pid' => 'P2', 'arrival' => 1, 'burst' => 8, 'priority' => 1],
                        ['pid' => 'P3', 'arrival' => 2, 'burst' => 7, 'priority' => 3],
                        ['pid' => 'P4', 'arrival' => 3, 'burst' => 3, 'priority' => 4],
                    ]
                ];
                
            case 'convoy':
                return [
                    'name' => 'Convoy Effect Demo',
                    'description' => 'Tests FCFS weakness - one long process blocks short ones',
                    'processes' => [
                        ['pid' => 'P1', 'arrival' => 0, 'burst' => 20, 'priority' => 3],
                        ['pid' => 'P2', 'arrival' => 1, 'burst' => 2, 'priority' => 1],
                        ['pid' => 'P3', 'arrival' => 2, 'burst' => 3, 'priority' => 2],
                        ['pid' => 'P4', 'arrival' => 3, 'burst' => 1, 'priority' => 1],
                        ['pid' => 'P5', 'arrival' => 4, 'burst' => 4, 'priority' => 2],
                    ]
                ];
                
            case 'uniform':
                return [
                    'name' => 'Uniform Workload',
                    'description' => 'Similar burst times - tests Round Robin advantage',
                    'processes' => [
                        ['pid' => 'P1', 'arrival' => 0, 'burst' => 5, 'priority' => 1],
                        ['pid' => 'P2', 'arrival' => 1, 'burst' => 5, 'priority' => 2],
                        ['pid' => 'P3', 'arrival' => 2, 'burst' => 6, 'priority' => 3],
                        ['pid' => 'P4', 'arrival' => 3, 'burst' => 5, 'priority' => 1],
                        ['pid' => 'P5', 'arrival' => 4, 'burst' => 4, 'priority' => 2],
                    ]
                ];
                
            case 'priority':
                return [
                    'name' => 'Priority-driven Scenario',
                    'description' => 'Mixed priorities - tests priority algorithms strength',
                    'processes' => [
                        ['pid' => 'P1', 'arrival' => 0, 'burst' => 10, 'priority' => 3],
                        ['pid' => 'P2', 'arrival' => 2, 'burst' => 5, 'priority' => 1],
                        ['pid' => 'P3', 'arrival' => 4, 'burst' => 2, 'priority' => 4],
                        ['pid' => 'P4', 'arrival' => 6, 'burst' => 8, 'priority' => 2],
                    ]
                ];
                
            case 'random':
                return self::generateRandom();
                
            default:
                return self::getDataset('classic');
        }
    }
    
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
            'processes' => $processes
        ];
    }
    
    public static function getAllDatasets() {
        return [
            'classic' => self::getDataset('classic'),
            'convoy' => self::getDataset('convoy'),
            'uniform' => self::getDataset('uniform'),
            'priority' => self::getDataset('priority'),
        ];
    }
}
