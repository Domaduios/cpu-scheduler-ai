<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once '../includes/datasets.php';
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit;
}
if (isset($input['action']) && $input['action'] === 'get_dataset') {
    $name = $input['name'] ?? 'classic';
    echo json_encode([
        'success' => true,
        'dataset' => Datasets::getDataset($name)
    ]);
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
    $results = runCppScheduler($processes, $quantum);
    if (isset($results['error'])) {
        throw new Exception('C++ engine: ' . $results['error']);
    }
    $recommendation = runPythonAI($processes, $results);
    if (isset($recommendation['error'])) {
        throw new Exception('Python AI: ' . $recommendation['error']);
    }
    $winnerMetrics = $results[$recommendation['recommended']]['metrics'];
    Datasets::saveSimulationHistory(
        $recommendation['workload_analysis']['workload_type'],
        $recommendation['workload_analysis']['process_count'],
        $recommendation['recommended'],
        $winnerMetrics
    );
    echo json_encode([
        'success' => true,
        'results' => $results,
        'ai' => $recommendation,
        'engines' => [
            'algorithms' => 'C++',
            'ai' => 'Python',
            'storage' => 'MySQL',
            'glue' => 'PHP'
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Calculation error: ' . $e->getMessage()]);
}
function runCppScheduler($processes, $quantum) {
    $isWindows = stripos(PHP_OS, 'WIN') === 0;
    $exeName = $isWindows ? 'scheduler.exe' : 'scheduler';
    $exePath = realpath(__DIR__ . '/../cpp/' . $exeName);
    if (!$exePath || !file_exists($exePath)) {
        throw new Exception(
            "C++ scheduler not found at: " . __DIR__ . '/../cpp/' . $exeName . 
            ". Compile it first using: g++ -O2 -std=c++17 scheduler.cpp -o $exeName"
        );
    }
    $inputJson = json_encode([
        'processes' => $processes,
        'quantum' => $quantum
    ]);
    return executeViaStdin($exePath, $inputJson, 'C++ scheduler');
}
function runPythonAI($processes, $results) {
    $scriptPath = realpath(__DIR__ . '/../python/ai_recommender.py');
    if (!$scriptPath || !file_exists($scriptPath)) {
        throw new Exception('Python AI script not found at: ' . __DIR__ . '/../python/ai_recommender.py');
    }
    $pythonCmd = detectPythonCommand();
    if (!$pythonCmd) {
        throw new Exception('Python is not installed or not in PATH. Install Python 3.x.');
    }
    $inputJson = json_encode([
        'processes' => $processes,
        'results' => $results
    ]);
    $command = escapeshellcmd($pythonCmd) . ' ' . escapeshellarg($scriptPath);
    return executeViaStdin($command, $inputJson, 'Python AI');
}
function executeViaStdin($command, $stdinData, $name) {
    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $process = proc_open($command, $descriptors, $pipes);
    if (!is_resource($process)) {
        throw new Exception("Failed to execute $name");
    }
    fwrite($pipes[0], $stdinData);
    fclose($pipes[0]);
    $stdout = stream_get_contents($pipes[1]);
    fclose($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[2]);
    $returnCode = proc_close($process);
    if ($returnCode !== 0) {
        throw new Exception("$name failed: " . ($stderr ?: 'Unknown error'));
    }
    $decoded = json_decode($stdout, true);
    if ($decoded === null) {
        throw new Exception("$name returned invalid JSON: " . substr($stdout, 0, 200));
    }
    return $decoded;
}
function detectPythonCommand() {
    $candidates = ['python3', 'python', 'py'];
    foreach ($candidates as $cmd) {
        $checkCommand = stripos(PHP_OS, 'WIN') === 0
            ? "where $cmd 2>NUL"
            : "which $cmd 2>/dev/null";
        $output = trim(shell_exec($checkCommand) ?? '');
        if (!empty($output)) {
            return $cmd;
        }
    }
    return null;
}