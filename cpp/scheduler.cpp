#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
#include <map>
#include <cmath>
#include <climits>
using namespace std;
struct Process {
    string pid;
    int arrival;
    int burst;
    int priority;
    bool hasPriority;
    Process() : arrival(0), burst(0), priority(0), hasPriority(false) {}
};
struct GanttSegment {
    string pid;
    int start;
    int end;
};
struct ProcessResult {
    string pid;
    int arrival;
    int burst;
    int priority;
    bool hasPriority;
    int completion;
    int turnaround;
    int waiting;
    int response;
};
struct ScheduleResult {
    vector<GanttSegment> gantt;
    vector<ProcessResult> processes;
    double avgWaiting;
    double avgTurnaround;
    double avgResponse;
    double throughput;
    double cpuUtilization;
    double fairness;
    int totalTime;
    int quantum;
};
class SimpleJson {
public:
    static void parseInput(const string& json,
                          vector<Process>& processes,
                          int& quantum) {
        quantum = 2;
        size_t qPos = json.find("\"quantum\"");
        if (qPos != string::npos) {
            size_t colon = json.find(':', qPos);
            if (colon != string::npos) {
                quantum = stoi(json.substr(colon + 1));
            }
        }
        size_t procsPos = json.find("\"processes\"");
        if (procsPos == string::npos) return;
        size_t arrStart = json.find('[', procsPos);
        size_t arrEnd = json.find(']', arrStart);
        if (arrStart == string::npos || arrEnd == string::npos) return;
        string arrayContent = json.substr(arrStart + 1, arrEnd - arrStart - 1);
        size_t pos = 0;
        while (pos < arrayContent.length()) {
            size_t objStart = arrayContent.find('{', pos);
            if (objStart == string::npos) break;
            size_t objEnd = arrayContent.find('}', objStart);
            if (objEnd == string::npos) break;
            string objStr = arrayContent.substr(objStart, objEnd - objStart + 1);
            processes.push_back(parseProcess(objStr));
            pos = objEnd + 1;
        }
    }
private:
    static Process parseProcess(const string& objStr) {
        Process p;
        p.pid = getString(objStr, "pid");
        p.arrival = getInt(objStr, "arrival");
        p.burst = getInt(objStr, "burst");
        if (hasKey(objStr, "priority")) {
            p.priority = getInt(objStr, "priority");
            p.hasPriority = true;
        }
        return p;
    }
    static bool hasKey(const string& s, const string& key) {
        string searchKey = "\"" + key + "\"";
        return s.find(searchKey) != string::npos;
    }
    static string getString(const string& s, const string& key) {
        string searchKey = "\"" + key + "\"";
        size_t pos = s.find(searchKey);
        if (pos == string::npos) return "";
        size_t firstQuote = s.find('"', pos + searchKey.length());
        size_t secondQuote = s.find('"', firstQuote + 1);
        if (firstQuote == string::npos || secondQuote == string::npos) return "";
        return s.substr(firstQuote + 1, secondQuote - firstQuote - 1);
    }
    static int getInt(const string& s, const string& key) {
        string searchKey = "\"" + key + "\"";
        size_t pos = s.find(searchKey);
        if (pos == string::npos) return 0;
        size_t colon = s.find(':', pos);
        if (colon == string::npos) return 0;
        size_t numStart = colon + 1;
        while (numStart < s.length() && (s[numStart] == ' ' || s[numStart] == '\t')) {
            numStart++;
        }
        size_t numEnd = numStart;
        if (s[numEnd] == '-') numEnd++;
        while (numEnd < s.length() && isdigit(s[numEnd])) {
            numEnd++;
        }
        if (numEnd == numStart) return 0;
        return stoi(s.substr(numStart, numEnd - numStart));
    }
};
class JsonBuilder {
public:
    static string buildOutput(const map<string, ScheduleResult>& results) {
        stringstream ss;
        ss << "{";
        bool first = true;
        for (const auto& [name, result] : results) {
            if (!first) ss << ",";
            first = false;
            ss << "\"" << name << "\":" << buildSchedule(result);
        }
        ss << "}";
        return ss.str();
    }
private:
    static string buildSchedule(const ScheduleResult& r) {
        stringstream ss;
        ss << "{";
        ss << "\"gantt\":[";
        for (size_t i = 0; i < r.gantt.size(); i++) {
            if (i > 0) ss << ",";
            ss << "{\"pid\":\"" << r.gantt[i].pid << "\","
               << "\"start\":" << r.gantt[i].start << ","
               << "\"end\":" << r.gantt[i].end << "}";
        }
        ss << "],";
        ss << "\"processes\":[";
        for (size_t i = 0; i < r.processes.size(); i++) {
            if (i > 0) ss << ",";
            const auto& p = r.processes[i];
            ss << "{"
               << "\"pid\":\"" << p.pid << "\","
               << "\"arrival\":" << p.arrival << ","
               << "\"burst\":" << p.burst << ",";
            if (p.hasPriority) {
                ss << "\"priority\":" << p.priority << ",";
            } else {
                ss << "\"priority\":null,";
            }
            ss << "\"completion\":" << p.completion << ","
               << "\"turnaround\":" << p.turnaround << ","
               << "\"waiting\":" << p.waiting << ","
               << "\"response\":" << p.response
               << "}";
        }
        ss << "],";
        ss << "\"metrics\":{"
           << "\"avg_waiting\":" << round2(r.avgWaiting) << ","
           << "\"avg_turnaround\":" << round2(r.avgTurnaround) << ","
           << "\"avg_response\":" << round2(r.avgResponse) << ","
           << "\"throughput\":" << round3(r.throughput) << ","
           << "\"cpu_utilization\":" << round2(r.cpuUtilization) << ","
           << "\"fairness\":" << round2(r.fairness) << ","
           << "\"total_time\":" << r.totalTime
           << "}";
        if (r.quantum > 0) {
            ss << ",\"quantum\":" << r.quantum;
        }
        ss << "}";
        return ss.str();
    }
    static string round2(double val) {
        char buf[32];
        snprintf(buf, sizeof(buf), "%.2f", val);
        return string(buf);
    }
    static string round3(double val) {
        char buf[32];
        snprintf(buf, sizeof(buf), "%.3f", val);
        return string(buf);
    }
};
void calculateMetrics(ScheduleResult& result, int totalTime) {
    int n = result.processes.size();
    if (n == 0) return;
    double sumWaiting = 0, sumTurnaround = 0, sumResponse = 0, sumBurst = 0;
    vector<double> waitings;
    for (const auto& p : result.processes) {
        sumWaiting += p.waiting;
        sumTurnaround += p.turnaround;
        sumResponse += p.response;
        sumBurst += p.burst;
        waitings.push_back(p.waiting);
    }
    result.avgWaiting = sumWaiting / n;
    result.avgTurnaround = sumTurnaround / n;
    result.avgResponse = sumResponse / n;
    result.throughput = totalTime > 0 ? (double)n / totalTime : 0;
    result.cpuUtilization = totalTime > 0 ? (sumBurst / totalTime) * 100 : 0;
    result.totalTime = totalTime;
    double variance = 0;
    for (double w : waitings) {
        variance += (w - result.avgWaiting) * (w - result.avgWaiting);
    }
    double stdDev = sqrt(variance / n);
    if (result.avgWaiting > 0) {
        result.fairness = max(0.0, 100.0 - (stdDev / result.avgWaiting * 100));
    } else {
        result.fairness = 100;
    }
}
ScheduleResult fcfs(vector<Process> processes) {
    sort(processes.begin(), processes.end(),
              [](const Process& a, const Process& b) {
                  return a.arrival < b.arrival;
              });
    ScheduleResult result;
    result.quantum = 0;
    int currentTime = 0;
    for (const auto& p : processes) {
        if (currentTime < p.arrival) {
            result.gantt.push_back({"IDLE", currentTime, p.arrival});
            currentTime = p.arrival;
        }
        int start = currentTime;
        int end = currentTime + p.burst;
        result.gantt.push_back({p.pid, start, end});
        ProcessResult pr;
        pr.pid = p.pid;
        pr.arrival = p.arrival;
        pr.burst = p.burst;
        pr.priority = p.priority;
        pr.hasPriority = p.hasPriority;
        pr.completion = end;
        pr.turnaround = end - p.arrival;
        pr.waiting = pr.turnaround - p.burst;
        pr.response = start - p.arrival;
        result.processes.push_back(pr);
        currentTime = end;
    }
    calculateMetrics(result, currentTime);
    return result;
}
ScheduleResult sjf(vector<Process> processes) {
    ScheduleResult result;
    result.quantum = 0;
    int n = processes.size();
    vector<bool> done(n, false);
    int completed = 0;
    int currentTime = 0;
    while (completed < n) {
        int selected = -1;
        int minBurst = INT_MAX;
        for (int i = 0; i < n; i++) {
            if (!done[i] && processes[i].arrival <= currentTime) {
                if (processes[i].burst < minBurst) {
                    minBurst = processes[i].burst;
                    selected = i;
                }
            }
        }
        if (selected == -1) {
            int nextArrival = INT_MAX;
            for (int i = 0; i < n; i++) {
                if (!done[i] && processes[i].arrival < nextArrival) {
                    nextArrival = processes[i].arrival;
                }
            }
            result.gantt.push_back({"IDLE", currentTime, nextArrival});
            currentTime = nextArrival;
            continue;
        }
        const auto& p = processes[selected];
        int start = currentTime;
        int end = currentTime + p.burst;
        result.gantt.push_back({p.pid, start, end});
        ProcessResult pr;
        pr.pid = p.pid;
        pr.arrival = p.arrival;
        pr.burst = p.burst;
        pr.priority = p.priority;
        pr.hasPriority = p.hasPriority;
        pr.completion = end;
        pr.turnaround = end - p.arrival;
        pr.waiting = pr.turnaround - p.burst;
        pr.response = start - p.arrival;
        result.processes.push_back(pr);
        currentTime = end;
        done[selected] = true;
        completed++;
    }
    calculateMetrics(result, currentTime);
    return result;
}
ScheduleResult srtf(vector<Process> processes) {
    ScheduleResult result;
    result.quantum = 0;
    int n = processes.size();
    vector<int> remaining(n);
    vector<int> startTime(n, -1);
    vector<int> completionTime(n, 0);
    for (int i = 0; i < n; i++) {
        remaining[i] = processes[i].burst;
    }
    int currentTime = 0;
    int completed = 0;
    string lastPid = "";
    int segmentStart = 0;
    while (completed < n) {
        int selected = -1;
        int minRemaining = INT_MAX;
        for (int i = 0; i < n; i++) {
            if (processes[i].arrival <= currentTime && remaining[i] > 0) {
                if (remaining[i] < minRemaining) {
                    minRemaining = remaining[i];
                    selected = i;
                }
            }
        }
        if (selected == -1) {
            if (!lastPid.empty() && lastPid != "IDLE") {
                result.gantt.push_back({lastPid, segmentStart, currentTime});
                segmentStart = currentTime;
            }
            lastPid = "IDLE";
            currentTime++;
            continue;
        }
        if (startTime[selected] == -1) {
            startTime[selected] = currentTime;
        }
        if (lastPid != processes[selected].pid) {
            if (!lastPid.empty()) {
                result.gantt.push_back({lastPid, segmentStart, currentTime});
            }
            segmentStart = currentTime;
            lastPid = processes[selected].pid;
        }
        remaining[selected]--;
        currentTime++;
        if (remaining[selected] == 0) {
            completed++;
            completionTime[selected] = currentTime;
        }
    }
    if (!lastPid.empty()) {
        result.gantt.push_back({lastPid, segmentStart, currentTime});
    }
    for (int i = 0; i < n; i++) {
        const auto& p = processes[i];
        ProcessResult pr;
        pr.pid = p.pid;
        pr.arrival = p.arrival;
        pr.burst = p.burst;
        pr.priority = p.priority;
        pr.hasPriority = p.hasPriority;
        pr.completion = completionTime[i];
        pr.turnaround = pr.completion - p.arrival;
        pr.waiting = pr.turnaround - p.burst;
        pr.response = startTime[i] - p.arrival;
        result.processes.push_back(pr);
    }
    calculateMetrics(result, currentTime);
    return result;
}
ScheduleResult rr(vector<Process> processes, int quantum) {
    ScheduleResult result;
    result.quantum = quantum;
    int n = processes.size();
    vector<int> remaining(n);
    vector<int> firstResponse(n, -1);
    vector<int> completionTime(n, 0);
    vector<bool> arrived(n, false);
    for (int i = 0; i < n; i++) {
        remaining[i] = processes[i].burst;
    }
    vector<int> sortedIndices(n);
    for (int i = 0; i < n; i++) sortedIndices[i] = i;
    sort(sortedIndices.begin(), sortedIndices.end(),
              [&](int a, int b) {
                  return processes[a].arrival < processes[b].arrival;
              });
    int currentTime = processes[sortedIndices[0]].arrival;
    vector<int> queue;
    queue.push_back(sortedIndices[0]);
    arrived[sortedIndices[0]] = true;
    while (!queue.empty()) {
        int idx = queue.front();
        queue.erase(queue.begin());
        if (firstResponse[idx] == -1) {
            firstResponse[idx] = currentTime;
        }
        int executeTime = min(quantum, remaining[idx]);
        int startExec = currentTime;
        int endExec = currentTime + executeTime;
        result.gantt.push_back({processes[idx].pid, startExec, endExec});
        remaining[idx] -= executeTime;
        currentTime = endExec;
        for (int i = 0; i < n; i++) {
            if (!arrived[i] && processes[i].arrival <= currentTime) {
                queue.push_back(i);
                arrived[i] = true;
            }
        }
        if (remaining[idx] > 0) {
            queue.push_back(idx);
        } else {
            completionTime[idx] = currentTime;
        }
        if (queue.empty()) {
            int nextProc = -1;
            int nextArrival = INT_MAX;
            for (int i = 0; i < n; i++) {
                if (!arrived[i] && processes[i].arrival < nextArrival) {
                    nextArrival = processes[i].arrival;
                    nextProc = i;
                }
            }
            if (nextProc != -1) {
                result.gantt.push_back({"IDLE", currentTime, nextArrival});
                currentTime = nextArrival;
                queue.push_back(nextProc);
                arrived[nextProc] = true;
            }
        }
    }
    for (int i = 0; i < n; i++) {
        const auto& p = processes[i];
        ProcessResult pr;
        pr.pid = p.pid;
        pr.arrival = p.arrival;
        pr.burst = p.burst;
        pr.priority = p.priority;
        pr.hasPriority = p.hasPriority;
        pr.completion = completionTime[i];
        pr.turnaround = pr.completion - p.arrival;
        pr.waiting = pr.turnaround - p.burst;
        pr.response = firstResponse[i] - p.arrival;
        result.processes.push_back(pr);
    }
    calculateMetrics(result, currentTime);
    return result;
}
ScheduleResult priorityNP(vector<Process> processes) {
    ScheduleResult result;
    result.quantum = 0;
    int n = processes.size();
    vector<bool> done(n, false);
    int completed = 0;
    int currentTime = 0;
    while (completed < n) {
        int selected = -1;
        int minPriority = INT_MAX;
        for (int i = 0; i < n; i++) {
            if (!done[i] && processes[i].arrival <= currentTime) {
                if (processes[i].priority < minPriority) {
                    minPriority = processes[i].priority;
                    selected = i;
                }
            }
        }
        if (selected == -1) {
            int nextArrival = INT_MAX;
            for (int i = 0; i < n; i++) {
                if (!done[i] && processes[i].arrival < nextArrival) {
                    nextArrival = processes[i].arrival;
                }
            }
            result.gantt.push_back({"IDLE", currentTime, nextArrival});
            currentTime = nextArrival;
            continue;
        }
        const auto& p = processes[selected];
        int start = currentTime;
        int end = currentTime + p.burst;
        result.gantt.push_back({p.pid, start, end});
        ProcessResult pr;
        pr.pid = p.pid;
        pr.arrival = p.arrival;
        pr.burst = p.burst;
        pr.priority = p.priority;
        pr.hasPriority = true;
        pr.completion = end;
        pr.turnaround = end - p.arrival;
        pr.waiting = pr.turnaround - p.burst;
        pr.response = start - p.arrival;
        result.processes.push_back(pr);
        currentTime = end;
        done[selected] = true;
        completed++;
    }
    calculateMetrics(result, currentTime);
    return result;
}
ScheduleResult priorityP(vector<Process> processes) {
    ScheduleResult result;
    result.quantum = 0;
    int n = processes.size();
    vector<int> remaining(n);
    vector<int> startTime(n, -1);
    vector<int> completionTime(n, 0);
    for (int i = 0; i < n; i++) {
        remaining[i] = processes[i].burst;
    }
    int currentTime = 0;
    int completed = 0;
    string lastPid = "";
    int segmentStart = 0;
    while (completed < n) {
        int selected = -1;
        int minPriority = INT_MAX;
        for (int i = 0; i < n; i++) {
            if (processes[i].arrival <= currentTime && remaining[i] > 0) {
                if (processes[i].priority < minPriority) {
                    minPriority = processes[i].priority;
                    selected = i;
                }
            }
        }
        if (selected == -1) {
            if (!lastPid.empty() && lastPid != "IDLE") {
                result.gantt.push_back({lastPid, segmentStart, currentTime});
                segmentStart = currentTime;
            }
            lastPid = "IDLE";
            currentTime++;
            continue;
        }
        if (startTime[selected] == -1) {
            startTime[selected] = currentTime;
        }
        if (lastPid != processes[selected].pid) {
            if (!lastPid.empty()) {
                result.gantt.push_back({lastPid, segmentStart, currentTime});
            }
            segmentStart = currentTime;
            lastPid = processes[selected].pid;
        }
        remaining[selected]--;
        currentTime++;
        if (remaining[selected] == 0) {
            completed++;
            completionTime[selected] = currentTime;
        }
    }
    if (!lastPid.empty()) {
        result.gantt.push_back({lastPid, segmentStart, currentTime});
    }
    for (int i = 0; i < n; i++) {
        const auto& p = processes[i];
        ProcessResult pr;
        pr.pid = p.pid;
        pr.arrival = p.arrival;
        pr.burst = p.burst;
        pr.priority = p.priority;
        pr.hasPriority = true;
        pr.completion = completionTime[i];
        pr.turnaround = pr.completion - p.arrival;
        pr.waiting = pr.turnaround - p.burst;
        pr.response = startTime[i] - p.arrival;
        result.processes.push_back(pr);
    }
    calculateMetrics(result, currentTime);
    return result;
}
int main() {
    string input((istreambuf_iterator<char>(cin)),
                       istreambuf_iterator<char>());
    if (input.empty()) {
        cout << "{\"error\":\"No input received\"}";
        return 1;
    }
    vector<Process> processes;
    int quantum = 2;
    SimpleJson::parseInput(input, processes, quantum);
    if (processes.empty()) {
        cout << "{\"error\":\"No processes parsed\"}";
        return 1;
    }
    map<string, ScheduleResult> results;
    results["FCFS"] = fcfs(processes);
    results["SJF"] = sjf(processes);
    results["SRTF"] = srtf(processes);
    results["RR"] = rr(processes, quantum);
    if (processes[0].hasPriority) {
        results["Priority_NP"] = priorityNP(processes);
        results["Priority_P"] = priorityP(processes);
    }
    cout << JsonBuilder::buildOutput(results);
    return 0;
}