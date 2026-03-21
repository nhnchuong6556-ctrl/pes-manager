export function getAllTimeStats(players, matches) {
  const stats = {};

  players.forEach((p) => {
    if (!stats[p.name]) {
      stats[p.name] = {
        name: p.name,
        avatar: p.avatar,
        P: 0,
        W: 0,
        D: 0,
        L: 0,
        GF: 0,
        GA: 0,
        wins90: 0,
        winsET: 0,
        winsPEN: 0,
        losses90: 0,
        lossesET: 0,
        lossesPEN: 0,
      };
    }
    if (p.avatar && !stats[p.name].avatar) stats[p.name].avatar = p.avatar;
  });

  matches.forEach((m) => {
    if (m.isArchived || typeof m.gh !== "number" || typeof m.ga !== "number")
      return;

    const homePlayer = players.find((p) => p.id === m.homeId);
    const awayPlayer = players.find((p) => p.id === m.awayId);
    if (!homePlayer || !awayPlayer) return;

    if (!stats[homePlayer.name])
      stats[homePlayer.name] = {
        name: homePlayer.name,
        avatar: homePlayer.avatar,
        P: 0,
        W: 0,
        D: 0,
        L: 0,
        GF: 0,
        GA: 0,
        wins90: 0,
        winsET: 0,
        winsPEN: 0,
        losses90: 0,
        lossesET: 0,
        lossesPEN: 0,
      };
    if (!stats[awayPlayer.name])
      stats[awayPlayer.name] = {
        name: awayPlayer.name,
        avatar: awayPlayer.avatar,
        P: 0,
        W: 0,
        D: 0,
        L: 0,
        GF: 0,
        GA: 0,
        wins90: 0,
        winsET: 0,
        winsPEN: 0,
        losses90: 0,
        lossesET: 0,
        lossesPEN: 0,
      };

    const h = stats[homePlayer.name];
    const a = stats[awayPlayer.name];

    h.P += 1;
    a.P += 1;
    h.GF += Number(m.gh) || 0;
    h.GA += Number(m.ga) || 0;
    a.GF += Number(m.ga) || 0;
    a.GA += Number(m.gh) || 0;

    let hRes = "D";
    let aRes = "D";
    if (m.gh > m.ga) {
      hRes = "W";
      aRes = "L";
    } else if (m.gh < m.ga) {
      hRes = "L";
      aRes = "W";
    } else if (m.winType === "PEN") {
      if (m.ph > m.pa) {
        hRes = "W";
        aRes = "L";
      } else if (m.pa > m.ph) {
        hRes = "L";
        aRes = "W";
      }
    }

    if (hRes === "W") {
      h.W += 1;
      if (m.winType === "ET") h.winsET += 1;
      else if (m.winType === "PEN") h.winsPEN += 1;
      else h.wins90 += 1;
    } else if (hRes === "L") {
      h.L += 1;
      if (m.winType === "ET") h.lossesET += 1;
      else if (m.winType === "PEN") h.lossesPEN += 1;
      else h.losses90 += 1;
    } else {
      h.D += 1;
    }

    if (aRes === "W") {
      a.W += 1;
      if (m.winType === "ET") a.winsET += 1;
      else if (m.winType === "PEN") a.winsPEN += 1;
      else a.wins90 += 1;
    } else if (aRes === "L") {
      a.L += 1;
      if (m.winType === "ET") a.lossesET += 1;
      else if (m.winType === "PEN") a.lossesPEN += 1;
      else a.losses90 += 1;
    } else {
      a.D += 1;
    }
  });

  return Object.values(stats)
    .map((item) => ({
      ...item,
      winRate: item.P > 0 ? (item.W / item.P) * 100 : 0,
      GD: item.GF - item.GA,
    }))
    .sort(
      (a, b) =>
        b.W - a.W ||
        b.winRate - a.winRate ||
        b.GD - a.GD ||
        b.GF - a.GF ||
        a.name.localeCompare(b.name)
    );
};


}
