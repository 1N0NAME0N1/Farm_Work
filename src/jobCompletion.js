export function hasJobReachedCompletion(job) {
  if (job.service === "gem_farm") {
    return job.updates.reduce(
      (sum, entry) => sum + (Number(entry.gemsEarned) || 0),
      0,
    ) >= job.targetGems;
  }

  if (job.service === "ore_farm") {
    const totals = {};
    for (const entry of job.updates)
      for (const log of entry.oreLogs || [])
        totals[log.oreType] = (totals[log.oreType] || 0) + (Number(log.earned) || 0);
    return job.oreTypes.length > 0 && job.oreTypes.every((oreType) => {
      const target = Number(job.oreTargets?.[oreType]);
      return Number.isInteger(target) && target > 0 && (totals[oreType] || 0) >= target;
    });
  }

  if (job.service === "account_care") {
    const reportedDays = new Set(job.updates.map((entry) => entry.date).filter(Boolean)).size;
    return job.durationDays > 0 && reportedDays >= job.durationDays;
  }

  return false;
}
