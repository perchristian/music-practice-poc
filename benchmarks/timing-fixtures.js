function constantFixture({ name, bpm = 120, bars = 8, beatsPerBar = 4, beatUnit = 4, downbeatTime = 0, jitter = () => 0, pickupBeats = 0 }) {
  const beatDuration = 60 / bpm;
  const observations = [];
  for (let beatIndex = -pickupBeats; beatIndex <= bars * beatsPerBar; beatIndex += 1) {
    observations.push({
      beatIndex,
      timeSeconds: downbeatTime + beatIndex * beatDuration + jitter(beatIndex),
      strength: beatIndex % beatsPerBar === 0 ? 1 : 0.65
    });
  }
  return {
    name,
    baseBpm: bpm,
    beatsPerBar,
    beatUnit,
    downbeatTime,
    observations,
    meterObservations: [],
    barTimes: Array.from({ length: bars }, (_, index) => downbeatTime + index * beatsPerBar * beatDuration),
    meterByBar: Array.from({ length: bars }, () => ({ beatsPerBar, beatUnit })),
    expectedCandidateBars: []
  };
}

function variableTempoFixture({ name, intervals, beatsPerBar = 4, beatUnit = 4, expectedCandidateBars }) {
  const observations = [{ beatIndex: 0, timeSeconds: 0, strength: 1 }];
  let timeSeconds = 0;
  for (let beatIndex = 1; beatIndex <= intervals.length; beatIndex += 1) {
    timeSeconds += intervals[beatIndex - 1];
    observations.push({ beatIndex, timeSeconds, strength: beatIndex % beatsPerBar === 0 ? 1 : 0.65 });
  }
  const bars = Math.floor(intervals.length / beatsPerBar);
  return {
    name,
    baseBpm: 60 / intervals[0],
    beatsPerBar,
    beatUnit,
    downbeatTime: 0,
    observations,
    meterObservations: [],
    barTimes: Array.from({ length: bars }, (_, barIndex) => observations[barIndex * beatsPerBar].timeSeconds),
    meterByBar: Array.from({ length: bars }, () => ({ beatsPerBar, beatUnit })),
    expectedCandidateBars
  };
}

const leadingSilence = constantFixture({
  name: "leading silence",
  downbeatTime: 1.2
});

const pickup = constantFixture({
  name: "pickup before bar one",
  downbeatTime: 1,
  pickupBeats: 2
});

const humanJitter = constantFixture({
  name: "stable human-like jitter",
  jitter: (beatIndex) => [0, 0.012, -0.009, 0.006][((beatIndex % 4) + 4) % 4]
});

const abruptTempoChange = variableTempoFixture({
  name: "abrupt 120 to 90 BPM change",
  intervals: [...Array(16).fill(0.5), ...Array(24).fill(2 / 3)],
  expectedCandidateBars: [5]
});

const gradualAccelerando = variableTempoFixture({
  name: "gradual accelerando",
  intervals: Array.from({ length: 40 }, (_, index) => index < 8 ? 0.6 : Math.max(0.42, 0.6 - (index - 7) * 0.008)),
  expectedCandidateBars: [4]
});

const gradualRitardando = variableTempoFixture({
  name: "gradual ritardando",
  intervals: Array.from({ length: 40 }, (_, index) => index < 8 ? 0.5 : Math.min(0.72, 0.5 + (index - 7) * 0.009)),
  expectedCandidateBars: [4]
});

const meterChange = (() => {
  const barMeters = [4, 4, 4, 4, 3, 3, 3, 3];
  const observations = [];
  const barTimes = [];
  const meterObservations = [];
  let beatIndex = 0;
  let timeSeconds = 0;
  for (let barIndex = 0; barIndex < barMeters.length; barIndex += 1) {
    const beats = barMeters[barIndex];
    barTimes.push(timeSeconds);
    meterObservations.push({ bar: barIndex + 1, beatsPerBar: beats, beatUnit: 4, confidence: 0.92 });
    for (let beat = 0; beat < beats; beat += 1) {
      observations.push({ beatIndex, timeSeconds, strength: beat === 0 ? 1 : 0.65 });
      beatIndex += 1;
      timeSeconds += 1;
    }
  }
  observations.push({ beatIndex, timeSeconds, strength: 1 });
  return {
    name: "4/4 to 3/4 meter change",
    baseBpm: 60,
    beatsPerBar: 4,
    beatUnit: 4,
    downbeatTime: 0,
    observations,
    meterObservations,
    barTimes,
    meterByBar: barMeters.map((beatsPerBar) => ({ beatsPerBar, beatUnit: 4 })),
    expectedCandidateBars: [5]
  };
})();

export const timingFixtures = [
  leadingSilence,
  pickup,
  humanJitter,
  abruptTempoChange,
  gradualAccelerando,
  gradualRitardando,
  meterChange
];
