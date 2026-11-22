const codeInfo = {
  0: ["Clear", "☀"], 1: ["Mostly clear", "☀"], 2: ["Partly cloudy", "◐"], 3: ["Cloudy", "☁"],
  45: ["Fog", "≋"], 48: ["Icy fog", "≋"], 51: ["Drizzle", "☂"], 53: ["Drizzle", "☂"], 55: ["Heavy drizzle", "☂"],
  56: ["Freezing drizzle", "❄"], 57: ["Freezing drizzle", "❄"], 61: ["Light rain", "☂"], 63: ["Rain", "☂"], 65: ["Heavy rain", "☂"],
  66: ["Freezing rain", "❄"], 67: ["Freezing rain", "❄"], 71: ["Light snow", "❄"], 73: ["Snow", "❄"], 75: ["Heavy snow", "❄"],
  77: ["Snow grains", "❄"], 80: ["Showers", "☂"], 81: ["Showers", "☂"], 82: ["Heavy showers", "☂"], 85: ["Snow showers", "❄"],
  86: ["Snow showers", "❄"], 95: ["Thunderstorm", "ϟ"], 96: ["Thunderstorm", "ϟ"], 99: ["Thunderstorm", "ϟ"],
};

const sources = [
  { name: "ECMWF IFS", provider: "European Centre", model: "ecmwf_ifs025" },
  { name: "UK Met Office", provider: "United Kingdom", model: "ukmo_global_deterministic_10km" },
  { name: "DWD ICON", provider: "Germany", model: "icon_seamless" },
  { name: "NOAA GFS", provider: "United States", model: "gfs_seamless" },
  { name: "Météo-France", provider: "France", model: "meteofrance_seamless" },
  { name: "MET Norway", provider: "Norway", model: "metno_seamless" },
];
let unit = "celsius";
let forecastData;
let locationLabel = "Glasgow, Scotland, GB";

function savingAllowed() {
  try {
    return localStorage.getItem("weather-privacy-choice") === "yes"
      && localStorage.getItem("weather-privacy-accepted") === "true";
  } catch { return false; }
}

function saveLocation(latitude, longitude, location, forecastDays = 7) {
  if (!savingAllowed()) return;
  try {
    localStorage.setItem("weather-location", JSON.stringify({ latitude, longitude, location, forecastDays }));
  } catch {}
}

function getSavedLocation() {
  try {
    const saved = localStorage.getItem("weather-location");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

const $ = (selector) => document.querySelector(selector);
const themeToggle = $("#theme-toggle");
const toDisplayTemp = (fahrenheit) => Math.round(unit === "fahrenheit" ? fahrenheit : (fahrenheit - 32) * 5 / 9);
const displayTemp = (fahrenheit) => `${toDisplayTemp(fahrenheit)}°`;
const weatherCode = (code) => codeInfo[code] || ["Variable", "☁"];

function setTheme(theme, save = false) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  themeToggle.title = `Switch to ${isDark ? "light" : "dark"} mode`;
  $("#theme-icon").textContent = isDark ? "☀" : "☾";
  $("#theme-label").textContent = isDark ? "Light" : "Dark";
  $("meta[name='theme-color']").content = isDark ? "#151d19" : "#f4f4ef";
  if (save && savingAllowed()) {
    try { localStorage.setItem("weather-theme", isDark ? "dark" : "light"); } catch {}
  }
}

let preferredUnit = "celsius";
try {
  if (!savingAllowed()) throw new Error("Saving disabled");
  const savedUnit = localStorage.getItem("weather-unit");
  if (savedUnit === "celsius" || savedUnit === "fahrenheit") preferredUnit = savedUnit;
} catch {}
unit = preferredUnit;
document.querySelectorAll("[data-unit]").forEach((button) => {
  const active = button.dataset.unit === preferredUnit;
  button.classList.toggle("active", active);
  button.setAttribute("aria-pressed", String(active));
});

let preferredTheme = "dark";
try {
  if (!savingAllowed()) throw new Error("Saving disabled");
  const savedTheme = localStorage.getItem("weather-theme");
  preferredTheme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
} catch {}
setTheme(preferredTheme);
const privacyNote = $("#privacy-note");
const footerAccept = $("#footer-accept");
const footerClearLocation = $("#footer-clear-location");
const footerDecline = $("#footer-decline");

function updateFooterConsent() {
  const accepted = localStorage.getItem("weather-privacy-choice") === "yes"
    && localStorage.getItem("weather-privacy-accepted") === "true"
    && getSavedLocation();
  footerAccept.hidden = Boolean(accepted);
  footerClearLocation.hidden = !accepted;
  footerDecline.hidden = !accepted;
}
document.body.classList.toggle("consent-open", privacyNote.hidden === false);
try {
  const consentChoice = localStorage.getItem("weather-privacy-choice");
  const acceptedFlag = localStorage.getItem("weather-privacy-accepted") === "true";
  const savedLocation = getSavedLocation();
  const accepted = consentChoice === "yes" && acceptedFlag && savedLocation;
  if (!accepted) {
    localStorage.removeItem("weather-location");
    localStorage.removeItem("weather-theme");
    localStorage.removeItem("weather-unit");
    localStorage.removeItem("weather-privacy-accepted");
    localStorage.removeItem("weather-privacy-choice");
    privacyNote.hidden = false;
  }
  updateFooterConsent();
} catch {
  privacyNote.hidden = false;
}
$("#accept-privacy").addEventListener("click", () => {
  try {
    localStorage.setItem("weather-privacy-choice", "yes");
    localStorage.setItem("weather-privacy-accepted", "true");
    localStorage.setItem("weather-theme", document.documentElement.dataset.theme === "light" ? "light" : "dark");
    localStorage.setItem("weather-unit", unit);
  } catch {}
  if (forecastData) {
    saveLocation(
      forecastData.weather.latitude,
      forecastData.weather.longitude,
      forecastData.location,
      forecastData.requestedDays || 7
    );
  }
  privacyNote.hidden = true;
  updateFooterConsent();
  document.body.classList.remove("consent-open");
});
$("#decline-privacy").addEventListener("click", () => {
  try {
    localStorage.removeItem("weather-privacy-choice");
    localStorage.removeItem("weather-privacy-accepted");
    localStorage.removeItem("weather-location");
    localStorage.removeItem("weather-theme");
    localStorage.removeItem("weather-unit");
  } catch {}
  privacyNote.hidden = true;
  updateFooterConsent();
  document.body.classList.remove("consent-open");
});

$("#footer-accept").addEventListener("click", () => {
  try {
    localStorage.setItem("weather-privacy-choice", "yes");
    localStorage.setItem("weather-privacy-accepted", "true");
  } catch {}
  if (forecastData) {
    saveLocation(forecastData.weather.latitude, forecastData.weather.longitude, forecastData.location, forecastData.requestedDays || 7);
  }
  updateFooterConsent();
});

$("#footer-decline").addEventListener("click", () => {
  try {
    localStorage.removeItem("weather-privacy-choice");
    localStorage.removeItem("weather-privacy-accepted");
    localStorage.removeItem("weather-location");
    localStorage.removeItem("weather-theme");
    localStorage.removeItem("weather-unit");
  } catch {}
  updateFooterConsent();
  privacyNote.hidden = true;
  document.body.classList.remove("consent-open");
});

$("#footer-clear-location").addEventListener("click", () => {
  try {
    localStorage.removeItem("weather-location");
    localStorage.removeItem("weather-theme");
    localStorage.removeItem("weather-unit");
    localStorage.removeItem("weather-privacy-accepted");
    localStorage.removeItem("weather-privacy-choice");
  } catch {}
  updateFooterConsent();
  privacyNote.hidden = false;
  document.body.classList.add("consent-open");
});

themeToggle.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
});

function renderSources(results) {
  const list = $("#source-list");
  list.replaceChildren(...results.map(({ source, temperature, error }) => {
    const row = document.createElement("div");
    row.className = "source-row";
    const label = document.createElement("span");
    label.innerHTML = `<strong>${source.name}</strong><small>${source.provider}</small>`;
    const value = document.createElement("span");
    value.className = error ? "source-unavailable" : "source-value";
    value.textContent = error ? "Unavailable" : displayTemp(temperature);
    row.append(label, value);
    return row;
  }));
}

async function loadSources(latitude, longitude) {
  const results = await Promise.all(sources.map(async (source) => {
    try {
      const params = new URLSearchParams({
        latitude, longitude,
        hourly: "temperature_2m,wind_speed_10m,wind_direction_10m,relative_humidity_2m,precipitation_probability",
        forecast_days: "14", temperature_unit: "fahrenheit", wind_speed_unit: "mph",
        timezone: "auto", models: source.model,
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!response.ok) throw new Error("Unavailable");
      const data = await response.json();
      return {
        source,
        temperature: data.hourly.temperature_2m?.[0],
        wind: data.hourly.wind_speed_10m?.[0],
        humidity: data.hourly.relative_humidity_2m?.[0],
        rain: data.hourly.precipitation_probability?.[0],
        hourly: data.hourly,
      };
    } catch {
      return { source, error: true };
    }
  }));
  renderSources(results);

  const average = (key) => {
    const values = results.map((result) => result[key]).filter((value) => Number.isFinite(value));
    return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
  };
  const averageTemperature = average("temperature");
  const averageWind = average("wind");
  const averageHumidity = average("humidity");
  const averageRain = average("rain");
  if (Number.isFinite(averageTemperature)) $("#temperature").textContent = displayTemp(averageTemperature);
  if (Number.isFinite(averageWind)) $("#wind").textContent = `${Math.round(averageWind)} mph avg`;
  if (Number.isFinite(averageHumidity)) {
    $("#humidity").textContent = `${Math.round(averageHumidity)}%`;
    $("#headline-humidity").textContent = `${Math.round(averageHumidity)}%`;
  }
  if (Number.isFinite(averageRain)) $("#rain").textContent = `${Math.round(averageRain)}%`;

  const sourceHourly = results.filter((result) => result.hourly?.time).map((result) => result.hourly);
  if (sourceHourly.length) {
    const time = sourceHourly[0].time;
    const meanAt = (field, index) => {
      const values = sourceHourly.map((hourly) => hourly[field]?.[index]).filter((value) => Number.isFinite(value));
      return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
    };
    const meanDirectionAt = (index) => {
      const values = sourceHourly.map((hourly) => hourly.wind_direction_10m?.[index]).filter((value) => Number.isFinite(value));
      if (!values.length) return null;
      const radians = values.map((value) => value * Math.PI / 180);
      const x = radians.reduce((total, value) => total + Math.cos(value), 0) / radians.length;
      const y = radians.reduce((total, value) => total + Math.sin(value), 0) / radians.length;
      return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    };
    const averageHourly = {
      time,
      temperature_2m: time.map((_, index) => meanAt("temperature_2m", index)),
      wind_speed_10m: time.map((_, index) => meanAt("wind_speed_10m", index)),
      wind_direction_10m: time.map((_, index) => meanDirectionAt(index)),
      precipitation_probability: time.map((_, index) => meanAt("precipitation_probability", index)),
      relative_humidity_2m: time.map((_, index) => meanAt("relative_humidity_2m", index)),
    };
    forecastData.averageHourly = averageHourly;
    renderForecast(forecastData);
  }
}

function renderForecast(data) {
  forecastData = data;
  const current = data.weather.current;
  const daily = data.weather.daily;
  const hourly = data.weather.hourly;
  const rainChance = Math.max(...hourly.precipitation_probability.slice(0, 6));
  const [description, symbol] = weatherCode(current.weather_code);

  $("#city-name").textContent = data.location;
  $("#description").textContent = description;
  $("#weather-icon").textContent = current.is_day ? symbol : ([0, 1].includes(current.weather_code) ? "☾" : symbol);
  $("#temperature").textContent = displayTemp(current.temperature_2m);
  $("#feels-like").textContent = displayTemp(current.apparent_temperature);
  $("#high").textContent = displayTemp(daily.temperature_2m_max[0]);
  $("#low").textContent = displayTemp(daily.temperature_2m_min[0]);
  $("#wind").textContent = `${Math.round(current.wind_speed_10m)} mph`;
  $("#rain").textContent = `${rainChance}%`;
  $("#humidity").textContent = `${current.relative_humidity_2m}%`;

  $("#week-forecast").replaceChildren(...daily.time.map((date, index) => {
    const dateValue = new Date(`${date}T12:00:00Z`);
    const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" }).format(dateValue);
    const calendarDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(dateValue);
    const label = index === 0 ? "Today" : index === 1 ? "Tomorrow" : weekday;
    const [condition, icon] = weatherCode(daily.weather_code[index]);
    const rain = daily.precipitation_probability_max[index] ?? 0;
    const averagedHourly = data.averageHourly || hourly;
    const periods = hourly.time.map((time, periodIndex) => ({ time, periodIndex }))
      .filter(({ time }) => time.startsWith(date))
      .filter(({ time }) => Number(time.slice(11, 13)) % 3 === 0)
      .filter(({ time }) => new Date(time).getTime() >= new Date(current.time).getTime())
      .slice(0, 8);
    const timeHeaders = periods.map(({ time }) => {
      const timestamp = new Date(time);
      return `<th scope="col">${new Intl.DateTimeFormat(undefined, { hour: "numeric", timeZone: data.weather.timezone }).format(timestamp)}</th>`;
    }).join("");
    const outlookRow = (icon, label, values) => `<tr><th scope="row" title="${label}"><b class="outlook-row-icon outlook-${label.toLowerCase()}" aria-label="${label}" aria-hidden="true">${icon}</b></th>${values}</tr>`;
    const temperatureCells = periods.map(({ time }) => {
      const periodIndex = averagedHourly.time.indexOf(time);
      const periodIcon = weatherCode(hourly.weather_code[periodIndex])?.[1] || "☁";
      const temperature = displayTemp(averagedHourly.temperature_2m[periodIndex]);
      return `<td title="Temperature: ${temperature}"><span class="outlook-temp"><b aria-hidden="true">${periodIcon}</b><strong>${temperature}</strong></span></td>`;
    }).join("");
    const windDirection = (degrees) => {
      const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      return directions[Math.round((degrees ?? 0) / 45) % 8];
    };
    const windCells = periods.map(({ time }) => {
      const periodIndex = averagedHourly.time.indexOf(time);
      const degrees = averagedHourly.wind_direction_10m[periodIndex] ?? 0;
      const speed = Math.round(averagedHourly.wind_speed_10m[periodIndex] ?? 0);
      const direction = windDirection(degrees);
      return `<td title="Wind: ${speed} mph from ${direction} (${degrees}°)"><span class="wind-cell"><b aria-hidden="true" style="--wind-angle:${degrees}deg">↑</b><strong>${speed} mph</strong><small>${direction}</small></span></td>`;
    }).join("");
    const rainCells = periods.map(({ time }) => {
      const periodIndex = averagedHourly.time.indexOf(time);
      const chance = Math.round(averagedHourly.precipitation_probability[periodIndex] ?? 0);
      return `<td title="Precipitation: ${chance}%"><span class="stat-icon rain-icon" aria-label="Precipitation ${chance}%">☂</span><strong class="rain-value">${chance}%</strong></td>`;
    }).join("");
    const humidityCells = periods.map(({ time }) => {
      const periodIndex = averagedHourly.time.indexOf(time);
      const humidity = Math.round(averagedHourly.relative_humidity_2m[periodIndex] ?? 0);
      return `<td title="Humidity: ${humidity}%"><span class="stat-icon humidity-icon" aria-label="Humidity ${humidity}%">≋</span><strong class="humidity-value">${humidity}%</strong></td>`;
    }).join("");
    const outlook = `<table class="outlook-table"><thead><tr><th scope="col" class="outlook-stat-head">Time</th>${timeHeaders}</tr></thead><tbody>${outlookRow("°", "Temperature", temperatureCells)}${outlookRow("↗", "Wind", windCells)}${outlookRow("☂", "Precipitation", rainCells)}${outlookRow("≋", "Humidity", humidityCells)}</tbody></table>`;
    const open = index === 0 ? " open" : "";
    const row = document.createElement("article");
    row.className = "day-row";
    row.innerHTML = `<div class="day-headline"><div class="day-date"><strong>${label}</strong><small>${calendarDate}</small></div><div class="day-condition"><span class="day-icon" aria-hidden="true">${icon}</span><span>${condition}</span></div><div class="day-temperature"><strong>${displayTemp(daily.temperature_2m_max[index])}</strong><span>${displayTemp(daily.temperature_2m_min[index])} low</span></div><div class="day-rain"><span aria-hidden="true">☂</span>${rain}%</div></div><details class="day-outlook"${open}><summary><span>3-hour outlook</span><small>${periods.length} periods</small></summary><div class="day-outlook-content">${outlook}</div></details>`;
    return row;
  }));
  $("#date-label").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: data.weather.timezone }).format(new Date(current.time));
  const extendButton = $("#extend-forecast");
  const loadedDays = forecastData.requestedDays ?? daily.time.length;
  $("#forecast-heading").textContent = `${loadedDays}-day forecast`;
  $("#week-panel").setAttribute("aria-label", `${loadedDays}-day forecast`);
  extendButton.disabled = loadedDays >= 14;
  extendButton.setAttribute("aria-label", loadedDays >= 14 ? "14-day forecast loaded" : "Add 7 more days, show 14 days");
  extendButton.querySelector("small").textContent = loadedDays >= 14 ? "14 days loaded" : "Add 7 more days";
  $("#dashboard").hidden = false;
  $("#status").hidden = true;
}

async function loadWeather(latitude, longitude, location, forecastDays = 7) {
  $("#status").hidden = false;
  $("#status").textContent = `Finding the forecast for ${location}...`;
  $("#dashboard").hidden = true;
  const params = new URLSearchParams({
    latitude, longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m",
    hourly: "temperature_2m,precipitation_probability,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
    temperature_unit: "fahrenheit", wind_speed_unit: "mph", timezone: "auto", forecast_days: String(forecastDays),
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error("Weather data is temporarily unavailable.");
  const weather = await response.json();
  saveLocation(latitude, longitude, location, forecastDays);
  renderForecast({ weather, location, requestedDays: forecastDays });
  loadSources(latitude, longitude);
}

async function searchCity(city) {
  $("#status").hidden = false;
  $("#status").textContent = `Searching for ${city}...`;
  const parts = city.split(",").map((part) => part.trim()).filter(Boolean);
  const townName = parts[0] || city;
  const suffixes = parts.slice(1).join(", ");
  const params = new URLSearchParams({ name: townName, count: "10", language: "en", format: "json" });
  let response;
  try {
    response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  } catch {
    if (townName.toLowerCase() === "glasgow") {
      await loadWeather(55.86515, -4.25763, "Glasgow, Glasgow City, Scotland, GB");
      return;
    }
    throw new Error("City search is temporarily unavailable.");
  }
  if (!response.ok) {
    if (townName.toLowerCase() === "glasgow") {
      await loadWeather(55.86515, -4.25763, "Glasgow, Glasgow City, Scotland, GB");
      return;
    }
    throw new Error("City search is temporarily unavailable.");
  }
  const result = await response.json();
  if (!result.results?.length) throw new Error(`Couldn't find "${city}". Try another city.`);
  const exactMatches = result.results.filter((place) => place.name.toLowerCase() === townName.toLowerCase());
  const suffixMatch = exactMatches.find((place) => suffixes.toLowerCase().split(", ").every((suffix) =>
    [place.admin1, place.admin2, place.admin3, place.country_code, place.country].filter(Boolean).some((field) =>
      field.toLowerCase().includes(suffix)
    )
  ));
  const place = suffixMatch || exactMatches.find((place) => place.country_code === "GB") || exactMatches[0] || result.results[0];
  const resolvedTownName = place.name || townName;
  const location = [resolvedTownName, place.admin2, place.admin1, place.country_code]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(", ");
  await loadWeather(place.latitude, place.longitude, location);
}

$("#search-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try { await searchCity($("#city-input").value.trim()); }
  catch (error) { $("#status").hidden = false; $("#status").textContent = error.message; }
});

$("#locate").addEventListener("click", () => {
  if (!navigator.geolocation) { $("#status").hidden = false; $("#status").textContent = "Location isn't available. Search for a city instead."; return; }
  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    let location = "Your location";
    try {
      const reverseParams = new URLSearchParams({ latitude: String(coords.latitude), longitude: String(coords.longitude), localityLanguage: "en" });
      const reverseResponse = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${reverseParams}`);
      if (reverseResponse.ok) {
        const place = await reverseResponse.json();
        const localityInfo = place.localityInfo?.administrative;
        const county = localityInfo?.find((item) => item.adminLevel === 2 || item.order === 3)?.name
          || place.principalSubdivision;
        const town = place.locality || place.city || place.localityInfo?.find((item) => item.order === 1)?.name
          || county;
        const region = place.principalSubdivision || place.region;
        location = [town, county, region, place.countryCode]
          .filter((value, index, values) => value && values.indexOf(value) === index)
          .join(", ");
      }
    } catch {}
    loadWeather(coords.latitude, coords.longitude, location).catch((error) => { $("#status").hidden = false; $("#status").textContent = error.message; });
  }, () => { $("#status").hidden = false; $("#status").textContent = "Couldn't access your location. Search for a city instead."; }, { timeout: 10000 });
});

$("#extend-forecast").addEventListener("click", () => {
  if (!forecastData) return;
  const currentDays = forecastData.requestedDays ?? 7;
  if (currentDays >= 14) return;
  const nextDays = 14;
  loadWeather(forecastData.weather.latitude, forecastData.weather.longitude, forecastData.location, nextDays).catch((error) => {
    $("#status").hidden = false;
    $("#status").textContent = error.message;
  });
});

document.querySelectorAll("[data-unit]").forEach((button) => button.addEventListener("click", () => {
  unit = button.dataset.unit;
  if (savingAllowed()) {
    try { localStorage.setItem("weather-unit", unit); } catch {}
  }
  document.querySelectorAll("[data-unit]").forEach((other) => {
    const active = other === button;
    other.classList.toggle("active", active);
    other.setAttribute("aria-pressed", String(active));
  });
  if (forecastData) {
    renderForecast(forecastData);
    loadSources(forecastData.weather.latitude, forecastData.weather.longitude);
  }
}));

const savedLocation = savingAllowed() ? getSavedLocation() : null;
if (savedLocation?.latitude && savedLocation?.longitude) {
  loadWeather(savedLocation.latitude, savedLocation.longitude, savedLocation.location, savedLocation.forecastDays || 7)
    .catch((error) => { $("#status").textContent = error.message; });
} else {
  searchCity("Glasgow").catch((error) => { $("#status").textContent = error.message; });
}