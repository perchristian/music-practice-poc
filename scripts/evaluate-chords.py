#!/usr/bin/env python3
"""Evaluate chord predictions with mir_eval and emit one JSON document."""

import json
import sys
from pathlib import Path

import mir_eval
import numpy as np


METRICS = {
    "root": mir_eval.chord.root,
    "majmin": mir_eval.chord.majmin,
    "triads": mir_eval.chord.triads,
    "mirex": mir_eval.chord.mirex,
}


def adjusted(intervals, duration):
    values = np.asarray([[row["start"], row["end"]] for row in intervals], dtype=float)
    labels = [row["label"] for row in intervals]
    return mir_eval.util.adjust_intervals(
        values,
        labels,
        t_min=0.0,
        t_max=float(duration),
        start_label="N",
        end_label="N",
    )


def metric_parts(comparisons, durations):
    comparisons = np.asarray(comparisons)
    valid = comparisons >= 0
    denominator = float(np.sum(durations[valid]))
    numerator = float(np.sum(comparisons[valid] * durations[valid]))
    return {
        "score": numerator / denominator if denominator else 0.0,
        "correctDurationSeconds": numerator,
        "scoredDurationSeconds": denominator,
        "oovDurationSeconds": float(np.sum(durations[~valid])),
    }


def change_boundaries(rows, duration):
    intervals, labels = adjusted(rows, duration)
    return np.asarray([
        intervals[index][0]
        for index in range(1, len(intervals))
        if labels[index] != labels[index - 1] and 0 < intervals[index][0] < duration
    ])


def boundary_counts(reference, estimated, duration, window):
    ref = change_boundaries(reference, duration)
    est = change_boundaries(estimated, duration)
    matches = mir_eval.util.match_events(ref, est, window) if len(ref) and len(est) else []
    true_positives = len(matches)
    precision = true_positives / len(est) if len(est) else (1.0 if not len(ref) else 0.0)
    recall = true_positives / len(ref) if len(ref) else (1.0 if not len(est) else 0.0)
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {
        "windowSeconds": window,
        "truePositives": true_positives,
        "referenceCount": int(len(ref)),
        "estimatedCount": int(len(est)),
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "falseExtraCount": int(len(est) - true_positives),
        "missingCount": int(len(ref) - true_positives),
    }


def boundary_parts(reference, estimated, duration):
    tolerances = {
        "100ms": boundary_counts(reference, estimated, duration, 0.1),
        "250ms": boundary_counts(reference, estimated, duration, 0.25),
    }
    return {**tolerances["250ms"], "tolerances": tolerances}


def evaluate_track(track):
    duration = float(track["durationSeconds"])
    ref_intervals, ref_labels = adjusted(track["reference"], duration)
    est_intervals, est_labels = adjusted(track["estimated"], duration)
    intervals, ref_labels, est_labels = mir_eval.util.merge_labeled_intervals(
        ref_intervals, ref_labels, est_intervals, est_labels
    )
    durations = mir_eval.util.intervals_to_durations(intervals)
    comparisons = {
        name: np.asarray(comparator(ref_labels, est_labels))
        for name, comparator in METRICS.items()
    }
    metrics = {name: metric_parts(values, durations) for name, values in comparisons.items()}
    errors = []
    for index, duration_seconds in enumerate(durations):
        if comparisons["majmin"][index] == 1:
            continue
        if comparisons["majmin"][index] < 0:
            category = "reference-oov"
        elif comparisons["root"][index] == 0:
            category = "wrong-root"
        else:
            category = "wrong-quality"
        errors.append({
            "trackId": track["trackId"],
            "category": category,
            "start": float(intervals[index][0]),
            "end": float(intervals[index][1]),
            "durationSeconds": float(duration_seconds),
            "reference": ref_labels[index],
            "estimated": est_labels[index],
        })
    return {
        "trackId": track["trackId"],
        "split": track["split"],
        "stratum": track.get("stratum"),
        "durationSeconds": duration,
        "runtimeMs": track["runtimeMs"],
        "metrics": metrics,
        "boundaries": boundary_parts(track["reference"], track["estimated"], duration),
        "cueDensity": {
            "referenceChangesPerMinute": len(change_boundaries(track["reference"], duration)) / (duration / 60),
            "estimatedChangesPerMinute": len(change_boundaries(track["estimated"], duration)) / (duration / 60),
            "rawReferenceCuesPerMinute": len(track["reference"]) / (duration / 60),
            "rawEstimatedCuesPerMinute": len(track["estimated"]) / (duration / 60),
            "rawReferenceCueCount": len(track["reference"]),
            "rawEstimatedCueCount": len(track["estimated"]),
        },
        "errors": errors,
    }


def aggregate_boundary(tracks, tolerance):
    values = [track["boundaries"]["tolerances"][tolerance] for track in tracks]
    tp = sum(value["truePositives"] for value in values)
    ref_count = sum(value["referenceCount"] for value in values)
    est_count = sum(value["estimatedCount"] for value in values)
    precision = tp / est_count if est_count else (1.0 if not ref_count else 0.0)
    recall = tp / ref_count if ref_count else (1.0 if not est_count else 0.0)
    return {
        "windowSeconds": values[0]["windowSeconds"] if values else (0.1 if tolerance == "100ms" else 0.25),
        "truePositives": tp,
        "referenceCount": ref_count,
        "estimatedCount": est_count,
        "precision": precision,
        "recall": recall,
        "f1": 2 * precision * recall / (precision + recall) if precision + recall else 0.0,
        "falseExtraCount": est_count - tp,
        "missingCount": ref_count - tp,
    }


def aggregate(tracks):
    result = {"metrics": {}, "boundaries": {}, "runtimeMs": {}, "cueDensity": {}}
    for metric in METRICS:
        numerator = sum(track["metrics"][metric]["correctDurationSeconds"] for track in tracks)
        denominator = sum(track["metrics"][metric]["scoredDurationSeconds"] for track in tracks)
        track_scores = sorted(track["metrics"][metric]["score"] for track in tracks)
        result["metrics"][metric] = {
            "score": numerator / denominator if denominator else 0.0,
            "medianTrackScore": float(np.median(track_scores)) if track_scores else 0.0,
            "correctDurationSeconds": numerator,
            "scoredDurationSeconds": denominator,
            "oovDurationSeconds": sum(track["metrics"][metric]["oovDurationSeconds"] for track in tracks),
        }
    tolerances = {name: aggregate_boundary(tracks, name) for name in ("100ms", "250ms")}
    result["boundaries"] = {**tolerances["250ms"], "tolerances": tolerances}
    runtimes = sorted(track["runtimeMs"] for track in tracks)
    total_duration = sum(track["durationSeconds"] for track in tracks)
    result["runtimeMs"] = {
        "total": sum(runtimes),
        "median": runtimes[len(runtimes) // 2] if runtimes else 0,
        "realTimeFactor": sum(runtimes) / (total_duration * 1000) if total_duration else 0,
    }
    result["cueDensity"] = {
        "referenceChangesPerMinute": sum(track["boundaries"]["referenceCount"] for track in tracks) / (total_duration / 60),
        "estimatedChangesPerMinute": sum(track["boundaries"]["estimatedCount"] for track in tracks) / (total_duration / 60),
        "rawReferenceCuesPerMinute": sum(track["cueDensity"]["rawReferenceCueCount"] for track in tracks) / (total_duration / 60),
        "rawEstimatedCuesPerMinute": sum(track["cueDensity"]["rawEstimatedCueCount"] for track in tracks) / (total_duration / 60),
    }
    all_errors = [error for track in tracks for error in track["errors"]]
    categories = ("wrong-root", "wrong-quality", "reference-oov")
    root_confusions = {}
    quality_confusions = {}
    oov_labels = {}
    for error in all_errors:
        if error["category"] == "wrong-root":
            key = f'{error["reference"].split(":", 1)[0]} -> {error["estimated"].split(":", 1)[0]}'
            root_confusions[key] = root_confusions.get(key, 0) + error["durationSeconds"]
        elif error["category"] == "wrong-quality":
            key = f'{error["reference"]} -> {error["estimated"]}'
            quality_confusions[key] = quality_confusions.get(key, 0) + error["durationSeconds"]
        else:
            key = error["reference"]
            oov_labels[key] = oov_labels.get(key, 0) + error["durationSeconds"]
    result["errors"] = {
        "durationSeconds": {
            category: sum(error["durationSeconds"] for error in all_errors if error["category"] == category)
            for category in categories
        },
        "largestSegments": sorted(all_errors, key=lambda error: error["durationSeconds"], reverse=True)[:10],
        "lowestMajMinTracks": [
            {"trackId": track["trackId"], "score": track["metrics"]["majmin"]["score"]}
            for track in sorted(tracks, key=lambda track: track["metrics"]["majmin"]["score"])[:5]
        ],
        "rootConfusions": dict(sorted(root_confusions.items(), key=lambda item: item[1], reverse=True)[:20]),
        "qualityConfusions": dict(sorted(quality_confusions.items(), key=lambda item: item[1], reverse=True)[:20]),
        "oovLabels": dict(sorted(oov_labels.items(), key=lambda item: item[1], reverse=True)),
    }
    return result


def main():
    payload = json.loads(Path(sys.argv[1]).read_text())
    tracks = [evaluate_track(track) for track in payload["tracks"]]
    output = {
        "evaluator": {"name": "mir_eval", "version": mir_eval.__version__},
        "tracks": tracks,
        "aggregate": aggregate(tracks),
        "complexityGroups": {
            stratum: aggregate([track for track in tracks if track["stratum"] == stratum])
            for stratum in ("low", "medium", "high")
            if any(track["stratum"] == stratum for track in tracks)
        },
        "splits": {
            split: aggregate([track for track in tracks if track["split"] == split])
            for split in ("development", "holdout")
            if any(track["split"] == split for track in tracks)
        },
    }
    json.dump(output, sys.stdout, indent=2)
    print()


if __name__ == "__main__":
    main()
