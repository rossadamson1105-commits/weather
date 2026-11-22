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
let locationLabel = "Glasgow, Scotland";

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
  if (save) {
    try { localStorage.setItem("weather-theme", isDark ? "dark" : "light"); } catch {}
  }
}

let preferredTheme = "light";
try {
  const savedTheme = localStorage.getItem("weather-theme");
  preferredTheme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
} catch {}
setTheme(preferredTheme);
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
        latitude, longitude, hourly: "temperature_2m", forecast_hours: "2", temperature_unit: "fahrenheit",
        timezone: "auto", models: source.model,
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!response.ok) throw new Error("Unavailable");
      const data = await response.json();
      const temperatures = data.hourly.temperature_2m;
      return { source, temperature: temperatures[0] };
    } catch {
      return { source, error: true };
    }
  }));
  renderSources(results);
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

  const startIndex = hourly.time.findIndex((time) => time >= current.time);
  const times = hourly.time.map((time, index) => ({ time, index }))
    .filter(({ index }) => index >= startIndex && (index - startIndex) % 3 === 0)
    .slice(0, 8);
  $("#hourly").replaceChildren(...times.map(({ time, index }, position) => {
    const hour = document.createElement("div");
    hour.className = "hour";
    const timestamp = new Date(time);
    const label = position === 0 ? "Now" : new Intl.DateTimeFormat(undefined, { hour: "numeric", timeZone: data.weather.timezone }).format(timestamp);
    const icon = weatherCode(hourly.weather_code[index])[1];
    const rain = hourly.precipitation_probability[index] ?? 0;
    const wind = Math.round(hourly.wind_speed_10m[index] ?? 0);
    const humidity = hourly.relative_humidity_2m[index] ?? 0;
    hour.innerHTML = `<span>${label}</span><b aria-hidden="true">${icon}</b><strong>${displayTemp(hourly.temperature_2m[index])}</strong><small>☂ ${rain}% · ↗ ${wind} mph · ◌ ${humidity}%</small>`;
    return hour;
  }));
  $("#week-forecast").replaceChildren(...daily.time.map((date, index) => {
    const dateValue = new Date(`${date}T12:00:00Z`);
    const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" }).format(dateValue);
    const calendarDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(dateValue);
    const label = index === 0 ? "Today" : index === 1 ? "Tomorrow" : weekday;
    const [condition, icon] = weatherCode(daily.weather_code[index]);
    const rain = daily.precipitation_probability_max[index] ?? 0;
    const periods = hourly.time.map((time, periodIndex) => ({ time, periodIndex }))
      .filter(({ time }) => time.startsWith(date))
      .filter(({ time }) => Number(time.slice(11, 13)) % 3 === 0)
      .filter(({ time }) => new Date(time).getTime() >= new Date(current.time).getTime())
      .slice(0, 8);
    const timeHeaders = periods.map(({ time }) => {
      const timestamp = new Date(time);
      return `<th scope="col">${new Intl.DateTimeFormat(undefined, { hour: "numeric", timeZone: data.weather.timezone }).format(timestamp)}</th>`;
    }).join("");
    const outlookRow = (icon, values) => `<tr><th scope="row"><b aria-hidden="true">${icon}</b></th>${values}</tr>`;
    const temperatureCells = periods.map(({ periodIndex }) => {
      const periodIcon = weatherCode(hourly.weather_code[periodIndex])[1];
      const temperature = displayTemp(hourly.temperature_2m[periodIndex]);
      return `<td title="Temperature: ${temperature}"><span class="outlook-temp"><b aria-hidden="true">${periodIcon}</b><strong>${temperature}</strong></span></td>`;
    }).join("");
    const windDirection = (degrees) => {
      const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      return directions[Math.round((degrees ?? 0) / 45) % 8];
    };
    const windCells = periods.map(({ periodIndex }) => {
      const speed = Math.round(hourly.wind_speed_10m[periodIndex] ?? 0);
      const direction = windDirection(hourly.wind_direction_10m[periodIndex]);
      return `<td title="Wind: ${speed} mph ${direction}">${speed} ${direction}</td>`;
    }).join("");
    const rainCells = periods.map(({ periodIndex }) => {
      const chance = hourly.precipitation_probability[periodIndex] ?? 0;
      return `<td title="Precipitation: ${chance}%"><span class="stat-icon rain-icon" aria-label="Precipitation ${chance}%">☂</span><strong class="rain-value">${chance}%</strong></td>`;
    }).join("");
    const humidityCells = periods.map(({ periodIndex }) => {
      const humidity = hourly.relative_humidity_2m[periodIndex] ?? 0;
      return `<td title="Humidity: ${humidity}%"><span class="stat-icon humidity-icon" aria-label="Humidity ${humidity}%">●</span><strong class="humidity-value">${humidity}%</strong></td>`;
    }).join("");
    const outlook = `<table class="outlook-table"><thead><tr><th scope="col" class="outlook-stat-head">Time</th>${timeHeaders}</tr></thead><tbody>${outlookRow("°", temperatureCells)}${outlookRow("↗", windCells)}${outlookRow("☂", rainCells)}${outlookRow("●", humidityCells)}</tbody></table>`;
    const open = index === 0 ? " open" : "";
    const row = document.createElement("article");
    row.className = "day-row";
    row.innerHTML = `<div class="day-headline"><div class="day-date"><strong>${label}</strong><small>${calendarDate}</small></div><div class="day-condition"><span class="day-icon" aria-hidden="true">${icon}</span><span>${condition}</span></div><div class="day-temperature"><strong>${displayTemp(daily.temperature_2m_max[index])}</strong><span>${displayTemp(daily.temperature_2m_min[index])} low</span></div><div class="day-rain"><span aria-hidden="true">☂</span>${rain}%</div></div><details class="day-outlook"${open}><summary><span>3-hour outlook</span><small>${periods.length} periods</small></summary><div class="day-outlook-content">${outlook}</div></details>`;
    return row;
  }));
  $("#date-label").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: data.weather.timezone }).format(new Date(current.time));
  const extendButton = $("#extend-forecast");
  const loadedDays = daily.time.length;
  extendButton.disabled = loadedDays >= 21;
  extendButton.querySelector("small").textContent = loadedDays >= 21 ? "21 days loaded" : loadedDays >= 14 ? "Add 7 more days" : "Add 7 more days";
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
  renderForecast({ weather, location });
  loadSources(latitude, longitude);
}

async function searchCity(city) {
  $("#status").hidden = false;
  $("#status").textContent = `Searching for ${city}...`;
  const params = new URLSearchParams({ name: city, count: "1", language: "en", format: "json" });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  if (!response.ok) throw new Error("City search is temporarily unavailable.");
  const result = await response.json();
  if (!result.results?.length) throw new Error(`Couldn't find "${city}". Try another city.`);
  const place = result.results[0];
  const location = [place.name, place.admin1, place.country_code].filter(Boolean).join(", ");
  await loadWeather(place.latitude, place.longitude, location);
}

$("#search-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try { await searchCity($("#city-input").value.trim()); }
  catch (error) { $("#status").hidden = false; $("#status").textContent = error.message; }
});

$("#locate").addEventListener("click", () => {
  if (!navigator.geolocation) { $("#status").hidden = false; $("#status").textContent = "Location isn't available. Search for a city instead."; return; }
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    loadWeather(coords.latitude, coords.longitude, "Your location").catch((error) => { $("#status").hidden = false; $("#status").textContent = error.message; });
  }, () => { $("#status").hidden = false; $("#status").textContent = "Couldn't access your location. Search for a city instead."; }, { timeout: 10000 });
});

$("#extend-forecast").addEventListener("click", () => {
  if (!forecastData) return;
  const currentDays = forecastData.weather.daily.time.length;
  if (currentDays >= 21) return;
  const nextDays = currentDays >= 14 ? 21 : 14;
  loadWeather(forecastData.weather.latitude, forecastData.weather.longitude, forecastData.location, nextDays).catch((error) => {
    $("#status").hidden = false;
    $("#status").textContent = error.message;
  });
});

document.querySelectorAll("[data-unit]").forEach((button) => button.addEventListener("click", () => {
  unit = button.dataset.unit;
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

searchCity("Glasgow").catch((error) => { $("#status").textContent = error.message; });