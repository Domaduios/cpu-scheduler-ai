#!/usr/bin/env python3
"""
AI Recommendation Engine - Python Implementation
==================================================
This is the "brain" of the system. It analyzes:
  1. The workload characteristics (uniform/mixed/diverse)
  2. The performance metrics from each algorithm
  3. Expert rules about when each algorithm shines
Then it gives each algorithm a score out of 100 and recommends
the best one with detailed reasoning.
Why Python?
  AI/decision systems are traditionally Python territory.
  The code is also much cleaner than its PHP equivalent.
Usage:
    Reads JSON from stdin (processes + results from C++).
    Outputs JSON to stdout (recommendation + reasoning).
"""
import sys
import json
import math
# ====================================================================
# WORKLOAD ANALYSIS
# Classifies the type of workload based on statistical properties.
# ====================================================================
def analyze_workload(processes):
    """
    Analyze the input workload and classify it.
    Returns a dict with statistics + classification flags.
    """
    n = len(processes)
    bursts = [p['burst'] for p in processes]
    arrivals = [p['arrival'] for p in processes]
    avg_burst = sum(bursts) / n
    max_burst = max(bursts)
    min_burst = min(bursts)
    # Standard deviation of burst times
    variance = sum((b - avg_burst) ** 2 for b in bursts) / n
    std_dev = math.sqrt(variance)
    # Coefficient of variation: tells us how spread out the bursts are
    burst_variation = std_dev / avg_burst if avg_burst > 0 else 0
    # Classification
    if burst_variation < 0.3:
        workload_type = 'Uniform'
        is_uniform, is_mixed, is_diverse = True, False, False
    elif burst_variation < 0.7:
        workload_type = 'Mixed'
        is_uniform, is_mixed, is_diverse = False, True, False
    else:
        workload_type = 'Diverse'
        is_uniform, is_mixed, is_diverse = False, False, True
    same_arrival = len(set(arrivals)) == 1
    has_priority = 'priority' in processes[0] and processes[0]['priority'] is not None
    return {
        'process_count': n,
        'avg_burst': round(avg_burst, 2),
        'max_burst': max_burst,
        'min_burst': min_burst,
        'std_deviation': round(std_dev, 2),
        'burst_variation': round(burst_variation, 3),
        'same_arrival': same_arrival,
        'has_priority': has_priority,
        'workload_type': workload_type,
        'is_uniform': is_uniform,
        'is_mixed': is_mixed,
        'is_diverse': is_diverse
    }
# ====================================================================
# RULE-BASED BONUS
# Each algorithm gets bonus points based on workload characteristics.
# This is "expert knowledge" encoded as rules.
# ====================================================================
def apply_rules(algorithm, analysis):
    """
    Apply expert rules to give each algorithm a bonus based on
    how well it fits the current workload.
    Returns a bonus between 0 and 40 points.
    """
    bonus = 0
    if algorithm == 'FCFS':
        if analysis['is_uniform']:
            bonus += 15  # FCFS works great when bursts are similar
        if analysis['is_diverse']:
            bonus -= 10  # Convoy effect hurts FCFS with diverse workloads
        if not analysis['same_arrival']:
            bonus += 10  # Good for sequential arrivals
        bonus += 5      # Simple to implement
    elif algorithm == 'SJF':
        if analysis['is_diverse']:
            bonus += 25  # SJF shines with diverse workloads
        elif analysis['is_mixed']:
            bonus += 18
        else:
            bonus += 8
        bonus += 10  # Optimal for avg waiting time
        if analysis['process_count'] > 6 and analysis['is_diverse']:
            bonus -= 5  # Starvation risk grows with more processes
    elif algorithm == 'SRTF':
        if analysis['is_diverse']:
            bonus += 22
        elif analysis['is_mixed']:
            bonus += 18
        else:
            bonus += 10
        if not analysis['same_arrival']:
            bonus += 12  # Preemption helps with spread arrivals
        if analysis['process_count'] > 6:
            bonus -= 5  # Context switching overhead
    elif algorithm == 'RR':
        if analysis['is_uniform']:
            bonus += 25  # RR is perfect for uniform workloads
        elif analysis['is_mixed']:
            bonus += 15
        else:
            bonus += 8
        bonus += 12  # Best response time + no starvation
    elif algorithm == 'Priority_NP':
        if analysis['has_priority']:
            bonus += 20
            if analysis['is_uniform']:
                bonus += 8
            if analysis['process_count'] > 5:
                bonus -= 5  # Starvation risk
        else:
            bonus -= 30  # Useless without priorities
    elif algorithm == 'Priority_P':
        if analysis['has_priority']:
            bonus += 22
            if analysis['is_diverse']:
                bonus += 8
            if analysis['process_count'] > 5:
                bonus -= 3
        else:
            bonus -= 30
    # Clamp to 0-40 range
    return max(0, min(40, bonus))
# ====================================================================
# SCORING SYSTEM
# Combines performance metrics + rule-based bonuses.
# Total: 100 points = 60 (performance) + 40 (rules)
# ====================================================================
def score_algorithms(analysis, all_results):
    """
    Score each algorithm out of 100.
    60 points come from performance (relative to other algorithms):
      - 25 pts: Average waiting time (lower = better)
      - 15 pts: Average turnaround (lower = better)
      - 10 pts: Throughput (higher = better)
      - 10 pts: Fairness (higher = better)
    40 points come from rule-based bonuses (apply_rules).
    """
    scores = {}
    # Collect all metric values for normalization
    waiting = [r['metrics']['avg_waiting'] for r in all_results.values()]
    turnaround = [r['metrics']['avg_turnaround'] for r in all_results.values()]
    throughput = [r['metrics']['throughput'] for r in all_results.values()]
    fairness = [r['metrics']['fairness'] for r in all_results.values()]
    min_w, max_w = min(waiting), max(waiting)
    min_t, max_t = min(turnaround), max(turnaround)
    max_thr = max(throughput)
    max_f = max(fairness)
    for name, result in all_results.items():
        m = result['metrics']
        score = 0
        # Waiting time score (25 pts)
        if max_w > min_w:
            score += 25 * (1 - (m['avg_waiting'] - min_w) / (max_w - min_w))
        else:
            score += 25
        # Turnaround score (15 pts)
        if max_t > min_t:
            score += 15 * (1 - (m['avg_turnaround'] - min_t) / (max_t - min_t))
        else:
            score += 15
        # Throughput score (10 pts)
        if max_thr > 0:
            score += 10 * (m['throughput'] / max_thr)
        # Fairness score (10 pts)
        if max_f > 0:
            score += 10 * (m['fairness'] / max_f)
        # Rule-based bonus (40 pts)
        score += apply_rules(name, analysis)
        scores[name] = round(score, 2)
    return scores
# ====================================================================
# REASONING - human-readable explanation for each algorithm
# ====================================================================
def generate_reasoning(analysis, all_results):
    """
    Build a list of pros/cons for each algorithm based on the
    workload characteristics. This makes the AI feel "explainable".
    """
    reasoning = {}
    for algo, result in all_results.items():
        points = []
        if algo == 'FCFS':
            if analysis['is_diverse']:
                points.append({'type': 'warning',
                              'text': 'Convoy effect: long process delays short ones'})
            else:
                points.append({'type': 'success',
                              'text': 'Fair execution order, predictable timing'})
            points.append({'type': 'info',
                          'text': 'Simple to implement, low overhead'})
        elif algo == 'SJF':
            points.append({'type': 'success',
                          'text': 'Optimal for minimizing waiting time (theoretically proven)'})
            if analysis['is_diverse']:
                points.append({'type': 'success',
                              'text': 'Excellent fit for diverse burst times'})
            if analysis['process_count'] > 5:
                points.append({'type': 'warning',
                              'text': 'Long processes may face starvation'})
        elif algo == 'SRTF':
            points.append({'type': 'success',
                          'text': 'Best theoretical waiting time (preemptive optimization)'})
            if not analysis['same_arrival']:
                points.append({'type': 'success',
                              'text': 'Adapts efficiently to new arrivals'})
            points.append({'type': 'warning',
                          'text': 'Higher context-switching overhead'})
        elif algo == 'RR':
            q = result.get('quantum', 2)
            points.append({'type': 'info', 'text': f'Time quantum: {q} units'})
            points.append({'type': 'success',
                          'text': 'Fair to all processes, no starvation'})
            if analysis['is_uniform']:
                points.append({'type': 'success', 'text': 'Ideal for uniform workload'})
            points.append({'type': 'success',
                          'text': 'Excellent response time for interactive systems'})
        elif algo == 'Priority_NP':
            if analysis['has_priority']:
                points.append({'type': 'success', 'text': 'Respects user-defined priorities'})
                points.append({'type': 'warning', 'text': 'Risk of low-priority starvation'})
            else:
                points.append({'type': 'error', 'text': 'No priorities defined - not applicable'})
        elif algo == 'Priority_P':
            if analysis['has_priority']:
                points.append({'type': 'success', 'text': 'Immediate response for high-priority tasks'})
                points.append({'type': 'success', 'text': 'Suitable for real-time systems'})
                points.append({'type': 'warning', 'text': 'Higher context-switching overhead'})
            else:
                points.append({'type': 'error', 'text': 'No priorities defined - not applicable'})
        reasoning[algo] = points
    return reasoning
# ====================================================================
# RECOMMENDATION SUMMARY
# ====================================================================
def build_summary(winner, analysis, winner_result):
    """Build a human-readable recommendation summary."""
    names = {
        'FCFS': 'First Come First Serve',
        'SJF': 'Shortest Job First',
        'SRTF': 'Shortest Remaining Time First',
        'RR': 'Round Robin',
        'Priority_NP': 'Priority (Non-preemptive)',
        'Priority_P': 'Priority (Preemptive)'
    }
    m = winner_result['metrics']
    summary = (
        f"Based on a {analysis['workload_type']} workload of "
        f"{analysis['process_count']} processes "
        f"(burst variation: {analysis['burst_variation']}), "
        f"**{names[winner]}** is the optimal choice. "
        f"It achieves the best balance with waiting time of {m['avg_waiting']} units, "
        f"throughput of {m['throughput']}, "
        f"and fairness score of {m['fairness']}%."
    )
    return summary
# ====================================================================
# MAIN RECOMMENDATION FUNCTION
# ====================================================================
def recommend(processes, all_results):
    """
    The main entry point - takes processes and algorithm results,
    returns a full recommendation with scores and reasoning.
    """
    analysis = analyze_workload(processes)
    scores = score_algorithms(analysis, all_results)
    reasoning = generate_reasoning(analysis, all_results)
    # Winner = algorithm with the highest score
    winner = max(scores, key=scores.get)
    summary = build_summary(winner, analysis, all_results[winner])
    return {
        'workload_analysis': analysis,
        'scores': scores,
        'reasoning': reasoning,
        'recommended': winner,
        'recommendation_summary': summary
    }
# ====================================================================
# MAIN ENTRY POINT
# Reads {processes, results} from stdin, outputs recommendation JSON.
# ====================================================================
def main():
    try:
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        processes = data.get('processes', [])
        results = data.get('results', {})
        if not processes:
            print(json.dumps({'error': 'No processes provided'}))
            sys.exit(1)
        if not results:
            print(json.dumps({'error': 'No algorithm results provided'}))
            sys.exit(1)
        recommendation = recommend(processes, results)
        print(json.dumps(recommendation))
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON input: {str(e)}'}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': f'AI engine error: {str(e)}'}))
        sys.exit(1)
if __name__ == '__main__':
    main()