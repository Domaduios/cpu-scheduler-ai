<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../includes/algorithms.php';
require_once '../includes/ai_recommender.php';
require_once '../includes/datasets.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

// Handle dataset request
if (isset($input['action']) && $input['action'] === 'get_dataset') {
    $name = $input['name'] ?? 'classic';
    echo json_encode(['success' => true, 'dataset' => Datasets::getDataset($name)]);
    exit;
}

if (!isset($input['processes']) || empty($input['processes'])) {
    http_response_code(400);
    echo json_encode(['error' => 'At least one process required']);
    exit;
}

$processes = $input['processes'];
$quantum = $input['quantum'] ?? 2;

try {
    $results = [];
    $results['FCFS'] = SchedulingAlgorithms::FCFS($processes);
    $results['SJF'] = SchedulingAlgorithms::SJF($processes);
    $results['SRTF'] = SchedulingAlgorithms::SRTF($processes);
    $results['RR'] = SchedulingAlgorithms::RR($processes, $quantum);
    
    if (isset($processes[0]['priority'])) {
        $results['Priority_NP'] = SchedulingAlgorithms::PriorityNP($processes);
        $results['Priority_P'] = SchedulingAlgorithms::PriorityP($processes);
    }
    
    $recommendation = AIRecommender::recommend($processes, $results);
    
    echo json_encode([
        'success' => true,
        'results' => $results,
        'ai' => $recommendation
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Calculation error: ' . $e->getMessage()]);
}
