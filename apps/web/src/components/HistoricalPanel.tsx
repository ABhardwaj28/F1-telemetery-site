import { useMemo, useState } from "react";
import type { HistoricalChampion, HistoricalEra } from "../types";

export interface ConstructorChampion {
  year: number;
  team: string;
  engine: string;
  points: number;
  wins: number;
  poles: number;
  drivers: string[];
}

const ERAS: HistoricalEra[] = [
  {
    id: "all",
    name: "Complete Archive (All Eras)",
    years: "1950 – 2024",
    regulations: "Full 75-season historical championship records from the inaugural 1950 Silverstone GP to the 2024 Abu Dhabi GP finale.",
    keyFeature: "Every Drivers' World Champion (1950–2024) and Constructors' Champion (1958–2024) in Formula 1 history.",
    iconicCars: ["Mercedes W11", "McLaren MP4/4", "Ferrari F2004", "Lotus 72", "Alfa Romeo 158"],
  },
  {
    id: "ground_effect",
    name: "Ground Effect & Venturi Tunnels",
    years: "2022 – 2024",
    regulations: "1.6L V6 Turbo Hybrid + 3D Shaped Venturi Floors + 18-inch Pirelli Tyres",
    keyFeature: "Aerodynamic downforce generated through underbody ground effects to promote closer wheel-to-wheel racing.",
    iconicCars: ["Red Bull RB19 / RB20", "McLaren MCL38", "Ferrari SF-24"],
  },
  {
    id: "turbo_hybrid",
    name: "Turbo-Hybrid Dominance Era",
    years: "2014 – 2021",
    regulations: "1.6L Turbocharged V6 + MGU-K + MGU-H (50%+ Thermal Efficiency)",
    keyFeature: "The most thermally efficient, technologically advanced powertrains in motorsport history.",
    iconicCars: ["Mercedes W11 (Fastest ever F1 car)", "Red Bull RB16B", "Ferrari SF70H"],
  },
  {
    id: "v8_era",
    name: "High-Revving 2.4L V8 Era",
    years: "2006 – 2013",
    regulations: "2.4L Naturally Aspirated V8 (18,000 RPM) + KERS (from 2009) + Blown Diffusers",
    keyFeature: "Blown exhaust diffusers, ultra-responsive high-RPM screamers and the introduction of DRS.",
    iconicCars: ["Red Bull RB9", "Brawn BGP 001", "McLaren MP4-23", "Ferrari F2007"],
  },
  {
    id: "v10_era",
    name: "Golden V10 Era (900+ HP)",
    years: "1995 – 2005",
    regulations: "3.0L Naturally Aspirated V10 (20,000 RPM, ~950 HP)",
    keyFeature: "Unrestricted engine development, tyre wars (Bridgestone vs Michelin), and raw mechanical grip.",
    iconicCars: ["Ferrari F2004 (Lap Record King)", "McLaren MP4-20", "Renault R25", "Williams FW26"],
  },
  {
    id: "classic_era",
    name: "Turbo Monsters & Active Suspension",
    years: "1975 – 1994",
    regulations: "1.5L Turbo (1400+ HP) to 3.5L V12 / V10 Engines + Active Suspension",
    keyFeature: "Manual sequential gearboxes, massive qualifying boost, carbon monocoques, and legendary rivalries.",
    iconicCars: ["McLaren MP4/4 (15/16 wins in 1988)", "Lotus 79", "Williams FW14B (Active Suspension)"],
  },
  {
    id: "vintage_era",
    name: "Pioneer Era & The Birth of F1",
    years: "1950 – 1974",
    regulations: "Front-engine roadsters to mid-engine aero pioneers (1.5L - 3.0L Cosworth DFV)",
    keyFeature: "Birth of the World Championship at Silverstone 1950, Fangio supremacy, rear wings introduction.",
    iconicCars: ["Alfa Romeo 158 Alfetta", "Maserati 250F", "Lotus 25", "Tyrrell 003"],
  },
];

// Complete 1950–2024 Drivers World Champions (75 Seasons)
const ALL_TIME_DRIVERS_1950_2024: HistoricalChampion[] = [
  { year: 2024, driver: "Max Verstappen", nationality: "NED", team: "Red Bull Racing", engine: "Honda RBPT", points: 429, wins: 9, poles: 8 },
  { year: 2023, driver: "Max Verstappen", nationality: "NED", team: "Red Bull Racing", engine: "Honda RBPT", points: 575, wins: 19, poles: 12 },
  { year: 2022, driver: "Max Verstappen", nationality: "NED", team: "Red Bull Racing", engine: "Red Bull Powertrains", points: 454, wins: 15, poles: 7 },
  { year: 2021, driver: "Max Verstappen", nationality: "NED", team: "Red Bull Racing", engine: "Honda", points: 395.5, wins: 10, poles: 10 },
  { year: 2020, driver: "Lewis Hamilton", nationality: "GBR", team: "Mercedes", engine: "Mercedes", points: 347, wins: 11, poles: 10 },
  { year: 2019, driver: "Lewis Hamilton", nationality: "GBR", team: "Mercedes", engine: "Mercedes", points: 413, wins: 11, poles: 5 },
  { year: 2018, driver: "Lewis Hamilton", nationality: "GBR", team: "Mercedes", engine: "Mercedes", points: 408, wins: 11, poles: 11 },
  { year: 2017, driver: "Lewis Hamilton", nationality: "GBR", team: "Mercedes", engine: "Mercedes", points: 363, wins: 9, poles: 11 },
  { year: 2016, driver: "Nico Rosberg", nationality: "GER", team: "Mercedes", engine: "Mercedes", points: 385, wins: 9, poles: 8 },
  { year: 2015, driver: "Lewis Hamilton", nationality: "GBR", team: "Mercedes", engine: "Mercedes", points: 381, wins: 10, poles: 11 },
  { year: 2014, driver: "Lewis Hamilton", nationality: "GBR", team: "Mercedes", engine: "Mercedes", points: 384, wins: 11, poles: 7 },
  { year: 2013, driver: "Sebastian Vettel", nationality: "GER", team: "Red Bull Racing", engine: "Renault", points: 397, wins: 13, poles: 9 },
  { year: 2012, driver: "Sebastian Vettel", nationality: "GER", team: "Red Bull Racing", engine: "Renault", points: 281, wins: 5, poles: 6 },
  { year: 2011, driver: "Sebastian Vettel", nationality: "GER", team: "Red Bull Racing", engine: "Renault", points: 392, wins: 11, poles: 15 },
  { year: 2010, driver: "Sebastian Vettel", nationality: "GER", team: "Red Bull Racing", engine: "Renault", points: 256, wins: 5, poles: 10 },
  { year: 2009, driver: "Jenson Button", nationality: "GBR", team: "Brawn GP", engine: "Mercedes", points: 95, wins: 6, poles: 4 },
  { year: 2008, driver: "Lewis Hamilton", nationality: "GBR", team: "McLaren", engine: "Mercedes", points: 98, wins: 5, poles: 7 },
  { year: 2007, driver: "Kimi Räikkönen", nationality: "FIN", team: "Ferrari", engine: "Ferrari", points: 110, wins: 6, poles: 3 },
  { year: 2006, driver: "Fernando Alonso", nationality: "ESP", team: "Renault", engine: "Renault", points: 134, wins: 7, poles: 6 },
  { year: 2005, driver: "Fernando Alonso", nationality: "ESP", team: "Renault", engine: "Renault", points: 133, wins: 7, poles: 6 },
  { year: 2004, driver: "Michael Schumacher", nationality: "GER", team: "Ferrari", engine: "Ferrari", points: 148, wins: 13, poles: 8 },
  { year: 2003, driver: "Michael Schumacher", nationality: "GER", team: "Ferrari", engine: "Ferrari", points: 93, wins: 6, poles: 5 },
  { year: 2002, driver: "Michael Schumacher", nationality: "GER", team: "Ferrari", engine: "Ferrari", points: 144, wins: 11, poles: 7 },
  { year: 2001, driver: "Michael Schumacher", nationality: "GER", team: "Ferrari", engine: "Ferrari", points: 123, wins: 9, poles: 11 },
  { year: 2000, driver: "Michael Schumacher", nationality: "GER", team: "Ferrari", engine: "Ferrari", points: 108, wins: 9, poles: 9 },
  { year: 1999, driver: "Mika Häkkinen", nationality: "FIN", team: "McLaren", engine: "Mercedes", points: 76, wins: 5, poles: 11 },
  { year: 1998, driver: "Mika Häkkinen", nationality: "FIN", team: "McLaren", engine: "Mercedes", points: 100, wins: 8, poles: 9 },
  { year: 1997, driver: "Jacques Villeneuve", nationality: "CAN", team: "Williams", engine: "Renault", points: 81, wins: 7, poles: 10 },
  { year: 1996, driver: "Damon Hill", nationality: "GBR", team: "Williams", engine: "Renault", points: 97, wins: 8, poles: 9 },
  { year: 1995, driver: "Michael Schumacher", nationality: "GER", team: "Benetton", engine: "Renault", points: 102, wins: 9, poles: 4 },
  { year: 1994, driver: "Michael Schumacher", nationality: "GER", team: "Benetton", engine: "Ford", points: 92, wins: 8, poles: 6 },
  { year: 1993, driver: "Alain Prost", nationality: "FRA", team: "Williams", engine: "Renault", points: 99, wins: 7, poles: 13 },
  { year: 1992, driver: "Nigel Mansell", nationality: "GBR", team: "Williams", engine: "Renault", points: 108, wins: 9, poles: 14 },
  { year: 1991, driver: "Ayrton Senna", nationality: "BRA", team: "McLaren", engine: "Honda", points: 96, wins: 7, poles: 8 },
  { year: 1990, driver: "Ayrton Senna", nationality: "BRA", team: "McLaren", engine: "Honda", points: 78, wins: 6, poles: 10 },
  { year: 1989, driver: "Alain Prost", nationality: "FRA", team: "McLaren", engine: "Honda", points: 76, wins: 4, poles: 2 },
  { year: 1988, driver: "Ayrton Senna", nationality: "BRA", team: "McLaren", engine: "Honda", points: 90, wins: 8, poles: 13 },
  { year: 1987, driver: "Nelson Piquet", nationality: "BRA", team: "Williams", engine: "Honda", points: 73, wins: 3, poles: 4 },
  { year: 1986, driver: "Alain Prost", nationality: "FRA", team: "McLaren", engine: "TAG", points: 72, wins: 4, poles: 1 },
  { year: 1985, driver: "Alain Prost", nationality: "FRA", team: "McLaren", engine: "TAG", points: 73, wins: 5, poles: 2 },
  { year: 1984, driver: "Niki Lauda", nationality: "AUT", team: "McLaren", engine: "TAG", points: 72, wins: 5, poles: 0 },
  { year: 1983, driver: "Nelson Piquet", nationality: "BRA", team: "Brabham", engine: "BMW", points: 59, wins: 3, poles: 1 },
  { year: 1982, driver: "Keke Rosberg", nationality: "FIN", team: "Williams", engine: "Ford Cosworth", points: 44, wins: 1, poles: 1 },
  { year: 1981, driver: "Nelson Piquet", nationality: "BRA", team: "Brabham", engine: "Ford Cosworth", points: 50, wins: 3, poles: 4 },
  { year: 1980, driver: "Alan Jones", nationality: "AUS", team: "Williams", engine: "Ford Cosworth", points: 67, wins: 5, poles: 3 },
  { year: 1979, driver: "Jody Scheckter", nationality: "RSA", team: "Ferrari", engine: "Ferrari", points: 51, wins: 3, poles: 1 },
  { year: 1978, driver: "Mario Andretti", nationality: "USA", team: "Lotus", engine: "Ford Cosworth", points: 64, wins: 6, poles: 8 },
  { year: 1977, driver: "Niki Lauda", nationality: "AUT", team: "Ferrari", engine: "Ferrari", points: 72, wins: 3, poles: 2 },
  { year: 1976, driver: "James Hunt", nationality: "GBR", team: "McLaren", engine: "Ford Cosworth", points: 69, wins: 6, poles: 8 },
  { year: 1975, driver: "Niki Lauda", nationality: "AUT", team: "Ferrari", engine: "Ferrari", points: 64.5, wins: 5, poles: 9 },
  { year: 1974, driver: "Emerson Fittipaldi", nationality: "BRA", team: "McLaren", engine: "Ford Cosworth", points: 55, wins: 3, poles: 2 },
  { year: 1973, driver: "Jackie Stewart", nationality: "GBR", team: "Tyrrell", engine: "Ford Cosworth", points: 71, wins: 5, poles: 3 },
  { year: 1972, driver: "Emerson Fittipaldi", nationality: "BRA", team: "Lotus", engine: "Ford Cosworth", points: 61, wins: 5, poles: 3 },
  { year: 1971, driver: "Jackie Stewart", nationality: "GBR", team: "Tyrrell", engine: "Ford Cosworth", points: 62, wins: 6, poles: 6 },
  { year: 1970, driver: "Jochen Rindt", nationality: "AUT", team: "Lotus", engine: "Ford Cosworth", points: 45, wins: 5, poles: 3 },
  { year: 1969, driver: "Jackie Stewart", nationality: "GBR", team: "Matra", engine: "Ford Cosworth", points: 63, wins: 6, poles: 2 },
  { year: 1968, driver: "Graham Hill", nationality: "GBR", team: "Lotus", engine: "Ford Cosworth", points: 48, wins: 3, poles: 2 },
  { year: 1967, driver: "Denny Hulme", nationality: "NZL", team: "Brabham", engine: "Repco", points: 51, wins: 2, poles: 0 },
  { year: 1966, driver: "Jack Brabham", nationality: "AUS", team: "Brabham", engine: "Repco", points: 42, wins: 4, poles: 3 },
  { year: 1965, driver: "Jim Clark", nationality: "GBR", team: "Lotus", engine: "Climax", points: 54, wins: 6, poles: 6 },
  { year: 1964, driver: "John Surtees", nationality: "GBR", team: "Ferrari", engine: "Ferrari", points: 40, wins: 2, poles: 2 },
  { year: 1963, driver: "Jim Clark", nationality: "GBR", team: "Lotus", engine: "Climax", points: 54, wins: 7, poles: 7 },
  { year: 1962, driver: "Graham Hill", nationality: "GBR", team: "BRM", engine: "BRM", points: 42, wins: 4, poles: 1 },
  { year: 1961, driver: "Phil Hill", nationality: "USA", team: "Ferrari", engine: "Ferrari", points: 34, wins: 2, poles: 5 },
  { year: 1960, driver: "Jack Brabham", nationality: "AUS", team: "Cooper", engine: "Climax", points: 43, wins: 5, poles: 3 },
  { year: 1959, driver: "Jack Brabham", nationality: "AUS", team: "Cooper", engine: "Climax", points: 31, wins: 2, poles: 1 },
  { year: 1958, driver: "Mike Hawthorn", nationality: "GBR", team: "Ferrari", engine: "Ferrari", points: 42, wins: 1, poles: 4 },
  { year: 1957, driver: "Juan Manuel Fangio", nationality: "ARG", team: "Maserati", engine: "Maserati", points: 40, wins: 4, poles: 4 },
  { year: 1956, driver: "Juan Manuel Fangio", nationality: "ARG", team: "Ferrari", engine: "Ferrari", points: 30, wins: 3, poles: 6 },
  { year: 1955, driver: "Juan Manuel Fangio", nationality: "ARG", team: "Mercedes", engine: "Mercedes", points: 40, wins: 4, poles: 3 },
  { year: 1954, driver: "Juan Manuel Fangio", nationality: "ARG", team: "Maserati / Mercedes", engine: "Maserati / Mercedes", points: 42, wins: 6, poles: 5 },
  { year: 1953, driver: "Alberto Ascari", nationality: "ITA", team: "Ferrari", engine: "Ferrari", points: 34.5, wins: 5, poles: 6 },
  { year: 1952, driver: "Alberto Ascari", nationality: "ITA", team: "Ferrari", engine: "Ferrari", points: 36, wins: 6, poles: 5 },
  { year: 1951, driver: "Juan Manuel Fangio", nationality: "ARG", team: "Alfa Romeo", engine: "Alfa Romeo", points: 31, wins: 3, poles: 4 },
  { year: 1950, driver: "Giuseppe Farina", nationality: "ITA", team: "Alfa Romeo", engine: "Alfa Romeo", points: 30, wins: 3, poles: 2 },
];

// Complete 1958–2024 Constructors World Champions (67 Seasons - WCC founded 1958)
const ALL_TIME_CONSTRUCTORS_1958_2024: ConstructorChampion[] = [
  { year: 2024, team: "McLaren", engine: "Mercedes", points: 666, wins: 6, poles: 8, drivers: ["NOR", "PIA"] },
  { year: 2023, team: "Red Bull Racing", engine: "Honda RBPT", points: 860, wins: 21, poles: 14, drivers: ["VER", "PER"] },
  { year: 2022, team: "Red Bull Racing", engine: "Red Bull Powertrains", points: 759, wins: 17, poles: 8, drivers: ["VER", "PER"] },
  { year: 2021, team: "Mercedes", engine: "Mercedes", points: 613.5, wins: 9, poles: 9, drivers: ["HAM", "BOT"] },
  { year: 2020, team: "Mercedes", engine: "Mercedes", points: 573, wins: 13, poles: 15, drivers: ["HAM", "BOT"] },
  { year: 2019, team: "Mercedes", engine: "Mercedes", points: 739, wins: 15, poles: 10, drivers: ["HAM", "BOT"] },
  { year: 2018, team: "Mercedes", engine: "Mercedes", points: 655, wins: 12, poles: 13, drivers: ["HAM", "BOT"] },
  { year: 2017, team: "Mercedes", engine: "Mercedes", points: 668, wins: 12, poles: 15, drivers: ["HAM", "BOT"] },
  { year: 2016, team: "Mercedes", engine: "Mercedes", points: 765, wins: 19, poles: 20, drivers: ["ROS", "HAM"] },
  { year: 2015, team: "Mercedes", engine: "Mercedes", points: 703, wins: 16, poles: 18, drivers: ["HAM", "ROS"] },
  { year: 2014, team: "Mercedes", engine: "Mercedes", points: 701, wins: 16, poles: 18, drivers: ["HAM", "ROS"] },
  { year: 2013, team: "Red Bull Racing", engine: "Renault", points: 596, wins: 13, poles: 11, drivers: ["VET", "WEB"] },
  { year: 2012, team: "Red Bull Racing", engine: "Renault", points: 460, wins: 7, poles: 8, drivers: ["VET", "WEB"] },
  { year: 2011, team: "Red Bull Racing", engine: "Renault", points: 650, wins: 12, poles: 18, drivers: ["VET", "WEB"] },
  { year: 2010, team: "Red Bull Racing", engine: "Renault", points: 498, wins: 9, poles: 15, drivers: ["VET", "WEB"] },
  { year: 2009, team: "Brawn GP", engine: "Mercedes", points: 172, wins: 8, poles: 5, drivers: ["BUT", "BAR"] },
  { year: 2008, team: "Ferrari", engine: "Ferrari", points: 172, wins: 8, poles: 8, drivers: ["RAI", "MAS"] },
  { year: 2007, team: "Ferrari", engine: "Ferrari", points: 204, wins: 9, poles: 9, drivers: ["RAI", "MAS"] },
  { year: 2006, team: "Renault", engine: "Renault", points: 206, wins: 8, poles: 7, drivers: ["ALO", "FIS"] },
  { year: 2005, team: "Renault", engine: "Renault", points: 191, wins: 8, poles: 7, drivers: ["ALO", "FIS"] },
  { year: 2004, team: "Ferrari", engine: "Ferrari", points: 262, wins: 15, poles: 12, drivers: ["MSC", "BAR"] },
  { year: 2003, team: "Ferrari", engine: "Ferrari", points: 158, wins: 8, poles: 8, drivers: ["MSC", "BAR"] },
  { year: 2002, team: "Ferrari", engine: "Ferrari", points: 221, wins: 15, poles: 10, drivers: ["MSC", "BAR"] },
  { year: 2001, team: "Ferrari", engine: "Ferrari", points: 179, wins: 9, poles: 11, drivers: ["MSC", "BAR"] },
  { year: 2000, team: "Ferrari", engine: "Ferrari", points: 170, wins: 10, poles: 10, drivers: ["MSC", "BAR"] },
  { year: 1999, team: "Ferrari", engine: "Ferrari", points: 128, wins: 6, poles: 3, drivers: ["IRV", "MSC", "SAL"] },
  { year: 1998, team: "McLaren", engine: "Mercedes", points: 156, wins: 9, poles: 12, drivers: ["HAK", "COU"] },
  { year: 1997, team: "Williams", engine: "Renault", points: 123, wins: 8, poles: 11, drivers: ["VIL", "FRE"] },
  { year: 1996, team: "Williams", engine: "Renault", points: 175, wins: 12, poles: 12, drivers: ["HIL", "VIL"] },
  { year: 1995, team: "Benetton", engine: "Renault", points: 137, wins: 11, poles: 4, drivers: ["MSC", "HER"] },
  { year: 1994, team: "Williams", engine: "Renault", points: 118, wins: 7, poles: 6, drivers: ["HIL", "MAN", "COU", "SEN"] },
  { year: 1993, team: "Williams", engine: "Renault", points: 168, wins: 10, poles: 15, drivers: ["PRO", "HIL"] },
  { year: 1992, team: "Williams", engine: "Renault", points: 164, wins: 10, poles: 15, drivers: ["MAN", "PAT"] },
  { year: 1991, team: "McLaren", engine: "Honda", points: 139, wins: 8, poles: 10, drivers: ["SEN", "BER"] },
  { year: 1990, team: "McLaren", engine: "Honda", points: 121, wins: 6, poles: 12, drivers: ["SEN", "BER"] },
  { year: 1989, team: "McLaren", engine: "Honda", points: 141, wins: 10, poles: 15, drivers: ["PRO", "SEN"] },
  { year: 1988, team: "McLaren", engine: "Honda", points: 199, wins: 15, poles: 15, drivers: ["SEN", "PRO"] },
  { year: 1987, team: "Williams", engine: "Honda", points: 137, wins: 9, poles: 12, drivers: ["PIQ", "MAN"] },
  { year: 1986, team: "Williams", engine: "Honda", points: 141, wins: 9, poles: 4, drivers: ["MAN", "PIQ"] },
  { year: 1985, team: "McLaren", engine: "TAG", points: 90, wins: 6, poles: 2, drivers: ["PRO", "LAU"] },
  { year: 1984, team: "McLaren", engine: "TAG", points: 143.5, wins: 12, poles: 3, drivers: ["LAU", "PRO"] },
  { year: 1983, team: "Ferrari", engine: "Ferrari", points: 89, wins: 4, poles: 8, drivers: ["ARN", "TAM"] },
  { year: 1982, team: "Ferrari", engine: "Ferrari", points: 74, wins: 3, poles: 3, drivers: ["PIR", "VIL", "TAM", "AND"] },
  { year: 1981, team: "Williams", engine: "Ford Cosworth", points: 95, wins: 4, poles: 2, drivers: ["JON", "REU"] },
  { year: 1980, team: "Williams", engine: "Ford Cosworth", points: 120, wins: 6, poles: 3, drivers: ["JON", "REU"] },
  { year: 1979, team: "Ferrari", engine: "Ferrari", points: 113, wins: 6, poles: 6, drivers: ["SCH", "VIL"] },
  { year: 1978, team: "Lotus", engine: "Ford Cosworth", points: 86, wins: 8, poles: 12, drivers: ["AND", "PET"] },
  { year: 1977, team: "Ferrari", engine: "Ferrari", points: 95, wins: 4, poles: 2, drivers: ["LAU", "REU"] },
  { year: 1976, team: "Ferrari", engine: "Ferrari", points: 83, wins: 6, poles: 4, drivers: ["LAU", "REG"] },
  { year: 1975, team: "Ferrari", engine: "Ferrari", points: 72.5, wins: 6, poles: 9, drivers: ["LAU", "REG"] },
  { year: 1974, team: "McLaren", engine: "Ford Cosworth", points: 73, wins: 4, poles: 2, drivers: ["FIT", "HUL"] },
  { year: 1973, team: "Lotus", engine: "Ford Cosworth", points: 92, wins: 7, poles: 10, drivers: ["FIT", "PET"] },
  { year: 1972, team: "Lotus", engine: "Ford Cosworth", points: 61, wins: 5, poles: 3, drivers: ["FIT", "WAL"] },
  { year: 1971, team: "Tyrrell", engine: "Ford Cosworth", points: 73, wins: 7, poles: 6, drivers: ["STE", "CEV"] },
  { year: 1970, team: "Lotus", engine: "Ford Cosworth", points: 59, wins: 6, poles: 3, drivers: ["RIN", "FIT"] },
  { year: 1969, team: "Matra", engine: "Ford Cosworth", points: 66, wins: 6, poles: 2, drivers: ["STE", "BEL"] },
  { year: 1968, team: "Lotus", engine: "Ford Cosworth", points: 62, wins: 5, poles: 5, drivers: ["HIL", "CLA"] },
  { year: 1967, team: "Brabham", engine: "Repco", points: 63, wins: 4, poles: 2, drivers: ["HUL", "BRA"] },
  { year: 1966, team: "Brabham", engine: "Repco", points: 42, wins: 4, poles: 3, drivers: ["BRA", "HUL"] },
  { year: 1965, team: "Lotus", engine: "Climax", points: 54, wins: 6, poles: 6, drivers: ["CLA", "SPE"] },
  { year: 1964, team: "Ferrari", engine: "Ferrari", points: 45, wins: 3, poles: 4, drivers: ["SUR", "BAN"] },
  { year: 1963, team: "Lotus", engine: "Climax", points: 54, wins: 7, poles: 7, drivers: ["CLA", "TAY"] },
  { year: 1962, team: "BRM", engine: "BRM", points: 42, wins: 4, poles: 1, drivers: ["HIL", "GIN"] },
  { year: 1961, team: "Ferrari", engine: "Ferrari", points: 40, wins: 5, poles: 6, drivers: ["HIL", "TRI"] },
  { year: 1960, team: "Cooper", engine: "Climax", points: 48, wins: 6, poles: 4, drivers: ["BRA", "BRU"] },
  { year: 1959, team: "Cooper", engine: "Climax", points: 40, wins: 5, poles: 5, drivers: ["BRA", "MOS"] },
  { year: 1958, team: "Vanwall", engine: "Vanwall", points: 48, wins: 6, poles: 7, drivers: ["MOS", "BRO"] },
];

export default function HistoricalPanel() {
  const [selectedEra, setSelectedEra] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"drivers" | "constructors" | "records">("drivers");
  const [searchQuery, setSearchQuery] = useState("");

  const currentEra = ERAS.find((e) => e.id === selectedEra) ?? ERAS[0];

  // Filter champions by era and search query
  const filteredDrivers = useMemo(() => {
    return ALL_TIME_DRIVERS_1950_2024.filter((c) => {
      // Era filter
      if (selectedEra === "ground_effect" && (c.year < 2022 || c.year > 2024)) return false;
      if (selectedEra === "turbo_hybrid" && (c.year < 2014 || c.year > 2021)) return false;
      if (selectedEra === "v8_era" && (c.year < 2006 || c.year > 2013)) return false;
      if (selectedEra === "v10_era" && (c.year < 1995 || c.year > 2005)) return false;
      if (selectedEra === "classic_era" && (c.year < 1975 || c.year > 1994)) return false;
      if (selectedEra === "vintage_era" && c.year > 1974) return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.driver.toLowerCase().includes(q) ||
          c.team.toLowerCase().includes(q) ||
          c.nationality.toLowerCase().includes(q) ||
          c.engine.toLowerCase().includes(q) ||
          String(c.year).includes(q)
        );
      }
      return true;
    });
  }, [selectedEra, searchQuery]);

  const filteredConstructors = useMemo(() => {
    return ALL_TIME_CONSTRUCTORS_1958_2024.filter((c) => {
      // Era filter
      if (selectedEra === "ground_effect" && (c.year < 2022 || c.year > 2024)) return false;
      if (selectedEra === "turbo_hybrid" && (c.year < 2014 || c.year > 2021)) return false;
      if (selectedEra === "v8_era" && (c.year < 2006 || c.year > 2013)) return false;
      if (selectedEra === "v10_era" && (c.year < 1995 || c.year > 2005)) return false;
      if (selectedEra === "classic_era" && (c.year < 1975 || c.year > 1994)) return false;
      if (selectedEra === "vintage_era" && c.year > 1974) return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.team.toLowerCase().includes(q) ||
          c.engine.toLowerCase().includes(q) ||
          String(c.year).includes(q)
        );
      }
      return true;
    });
  }, [selectedEra, searchQuery]);

  // Hall of Fame Multi-Title Leaderboard
  const allTimeTitles = useMemo(() => {
    const map = new Map<string, { driver: string; nationality: string; titles: number; years: number[] }>();
    ALL_TIME_DRIVERS_1950_2024.forEach((c) => {
      const prev = map.get(c.driver);
      if (prev) {
        prev.titles += 1;
        prev.years.push(c.year);
      } else {
        map.set(c.driver, { driver: c.driver, nationality: c.nationality, titles: 1, years: [c.year] });
      }
    });
    return Array.from(map.values())
      .filter((d) => d.titles >= 2)
      .sort((a, b) => b.titles - a.titles || b.years[0] - a.years[0]);
  }, []);

  const constructorTitles = useMemo(() => {
    const map = new Map<string, { team: string; titles: number; years: number[] }>();
    ALL_TIME_CONSTRUCTORS_1958_2024.forEach((c) => {
      const prev = map.get(c.team);
      if (prev) {
        prev.titles += 1;
        prev.years.push(c.year);
      } else {
        map.set(c.team, { team: c.team, titles: 1, years: [c.year] });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.titles - a.titles || b.years[0] - a.years[0]);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Top Hero ── */}
      <div className="hero-section" style={{ minHeight: 80, padding: "20px 28px" }}>
        <div>
          <div className="eyebrow">FIA FORMULA ONE WORLD CHAMPIONSHIP · 1950 – 2024 ARCHIVES</div>
          <h1 style={{ fontSize: 32, margin: "10px 0 0" }}>ALL-TIME HISTORICAL DATABASE</h1>
        </div>
        <div className="hero-metrics">
          <div className="metric"><span>SEASONS</span><strong>75</strong></div>
          <div className="metric"><span>WORLD CHAMPIONS</span><strong>34</strong></div>
          <div className="metric"><span>CONSTRUCTOR CUPS</span><strong>67</strong></div>
          <div className="metric"><span>GRAND PRIX RACES</span><strong>1,120+</strong></div>
        </div>
      </div>

      {/* ── Tabs & Search Bar ── */}
      <div className="panel" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          {/* Main Category Tabs */}
          <div style={{ display: "flex", gap: 8 }}>
            {(
              [
                { id: "drivers", label: `🏆 DRIVERS (1950–2024) [${filteredDrivers.length}]` },
                { id: "constructors", label: `🏎️ CONSTRUCTORS (1958–2024) [${filteredConstructors.length}]` },
                { id: "records", label: "👑 HALL OF FAME & RECORDS" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  background: activeTab === t.id ? "#e10600" : "#131318",
                  color: activeTab === t.id ? "#fff" : "#999",
                  border: "1px solid #282835",
                  padding: "8px 16px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: "IBM Plex Mono, monospace",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="text"
              placeholder="Search driver, team, year, engine…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "#0d0d12",
                border: "1px solid #282835",
                color: "#fff",
                padding: "8px 14px",
                borderRadius: 4,
                fontSize: 11,
                fontFamily: "IBM Plex Mono, monospace",
                minWidth: 260,
                outline: "none",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  background: "#222",
                  border: "none",
                  color: "#aaa",
                  padding: "8px 12px",
                  borderRadius: 4,
                  fontSize: 10,
                  cursor: "pointer",
                  fontFamily: "IBM Plex Mono, monospace",
                }}
              >
                CLEAR
              </button>
            )}
          </div>
        </div>

        {/* Technical Era Filter Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14, paddingTop: 14, borderTop: "1px solid #1c1c24" }}>
          <span style={{ fontSize: 10, color: "#666", alignSelf: "center", marginRight: 4, fontFamily: "IBM Plex Mono, monospace" }}>
            ERA:
          </span>
          {ERAS.map((era) => (
            <button
              key={era.id}
              onClick={() => setSelectedEra(era.id)}
              style={{
                background: selectedEra === era.id ? "#282835" : "transparent",
                color: selectedEra === era.id ? "#00E5FF" : "#888",
                border: `1px solid ${selectedEra === era.id ? "#00E5FF" : "#22222c"}`,
                padding: "4px 10px",
                borderRadius: 3,
                fontSize: 10,
                fontFamily: "IBM Plex Mono, monospace",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {era.name} ({era.years})
            </button>
          ))}
        </div>

        {/* Active Era Technical Specs Banner */}
        {currentEra && currentEra.id !== "all" && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              background: "rgba(0, 229, 255, 0.04)",
              border: "1px solid rgba(0, 229, 255, 0.2)",
              borderRadius: 4,
              fontSize: 10,
              fontFamily: "IBM Plex Mono, monospace",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", color: "#00E5FF", fontWeight: 600 }}>
              <span>ERA REGULATIONS: {currentEra.regulations}</span>
              <span>YEARS: {currentEra.years}</span>
            </div>
            <div style={{ color: "#aaa" }}>
              <span style={{ color: "#666" }}>TECH FOCUS: </span>
              {currentEra.keyFeature}
            </div>
            {currentEra.iconicCars && currentEra.iconicCars.length > 0 && (
              <div style={{ color: "#888" }}>
                <span style={{ color: "#666" }}>BENCHMARK CARS: </span>
                {currentEra.iconicCars.join(" • ")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── DRIVERS CHAMPIONS TABLE (1950 – 2024) ── */}
      {activeTab === "drivers" && (
        <div className="panel">
          <div className="panel-title">
            <div>
              <h2>FIA FORMULA 1 DRIVERS' WORLD CHAMPIONS (1950 – 2024)</h2>
              <span>{filteredDrivers.length} CHAMPIONSHIP TITLES ACROSS 75 SEASONS</span>
            </div>
            <strong>1950 — 2024</strong>
          </div>
          <div style={{ overflowX: "auto", maxHeight: 600 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}>
              <thead style={{ position: "sticky", top: 0, background: "#101014", zIndex: 2 }}>
                <tr style={{ borderBottom: "1px solid #282835", color: "#888896", textAlign: "left", height: 40 }}>
                  <th style={{ padding: "0 16px", width: 80 }}>YEAR</th>
                  <th style={{ padding: "0 16px" }}>WORLD CHAMPION</th>
                  <th style={{ padding: "0 16px" }}>CONSTRUCTOR / TEAM</th>
                  <th style={{ padding: "0 16px" }}>ENGINE</th>
                  <th style={{ padding: "0 16px", textAlign: "center" }}>WINS</th>
                  <th style={{ padding: "0 16px", textAlign: "center" }}>POLES</th>
                  <th style={{ padding: "0 16px", textAlign: "right" }}>POINTS</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((c) => (
                  <tr
                    key={c.year}
                    style={{
                      borderBottom: "1px solid #14141a",
                      height: 42,
                      background: c.year % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0 16px", fontWeight: 700, color: "#e10600" }}>{c.year}</td>
                    <td style={{ padding: "0 16px", fontWeight: 700, color: "#fff" }}>
                      {c.driver} <span style={{ color: "#777", fontWeight: 400, fontSize: 10 }}>({c.nationality})</span>
                    </td>
                    <td style={{ padding: "0 16px", color: "#ddd" }}>{c.team}</td>
                    <td style={{ padding: "0 16px", color: "#777" }}>{c.engine}</td>
                    <td style={{ padding: "0 16px", textAlign: "center", color: "#fff", fontWeight: 700 }}>{c.wins}</td>
                    <td style={{ padding: "0 16px", textAlign: "center", color: "#aaa" }}>{c.poles}</td>
                    <td style={{ padding: "0 16px", textAlign: "right", color: "#f5c518", fontWeight: 700 }}>
                      {c.points} PTS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CONSTRUCTORS CHAMPIONS TABLE (1958 – 2024) ── */}
      {activeTab === "constructors" && (
        <div className="panel">
          <div className="panel-title">
            <div>
              <h2>FIA FORMULA 1 CONSTRUCTORS' WORLD CHAMPIONS (1958 – 2024)</h2>
              <span>{filteredConstructors.length} INTERNATIONAL CUP & CONSTRUCTOR TITLES</span>
            </div>
            <strong>1958 — 2024</strong>
          </div>
          <div style={{ overflowX: "auto", maxHeight: 600 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}>
              <thead style={{ position: "sticky", top: 0, background: "#101014", zIndex: 2 }}>
                <tr style={{ borderBottom: "1px solid #282835", color: "#888896", textAlign: "left", height: 40 }}>
                  <th style={{ padding: "0 16px", width: 80 }}>YEAR</th>
                  <th style={{ padding: "0 16px" }}>CHAMPION CONSTRUCTOR</th>
                  <th style={{ padding: "0 16px" }}>ENGINE SUPPLIER</th>
                  <th style={{ padding: "0 16px" }}>CHAMPIONSHIP DRIVERS</th>
                  <th style={{ padding: "0 16px", textAlign: "center" }}>WINS</th>
                  <th style={{ padding: "0 16px", textAlign: "center" }}>POLES</th>
                  <th style={{ padding: "0 16px", textAlign: "right" }}>POINTS</th>
                </tr>
              </thead>
              <tbody>
                {filteredConstructors.map((c) => (
                  <tr
                    key={c.year}
                    style={{
                      borderBottom: "1px solid #14141a",
                      height: 42,
                      background: c.year % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0 16px", fontWeight: 700, color: "#00E5FF" }}>{c.year}</td>
                    <td style={{ padding: "0 16px", fontWeight: 700, color: "#fff" }}>{c.team}</td>
                    <td style={{ padding: "0 16px", color: "#888" }}>{c.engine}</td>
                    <td style={{ padding: "0 16px", color: "#aaa" }}>{c.drivers.join(" · ")}</td>
                    <td style={{ padding: "0 16px", textAlign: "center", color: "#fff", fontWeight: 700 }}>{c.wins}</td>
                    <td style={{ padding: "0 16px", textAlign: "center", color: "#aaa" }}>{c.poles}</td>
                    <td style={{ padding: "0 16px", textAlign: "right", color: "#f5c518", fontWeight: 700 }}>
                      {c.points} PTS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── HALL OF FAME & ALL TIME RECORDS ── */}
      {activeTab === "records" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Multi-Title Driver Rankings */}
          <div className="panel">
            <div className="panel-title">
              <div>
                <h2>ALL-TIME MULTI-CHAMPIONSHIP DRIVERS (1950 – 2024)</h2>
                <span>DRIVERS WITH 2 OR MORE FORMULA ONE WORLD TITLES</span>
              </div>
              <strong>{allTimeTitles.length} MULTI-CHAMPIONS</strong>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, padding: "16px 20px" }}>
              {allTimeTitles.map((d) => (
                <div
                  key={d.driver}
                  style={{
                    background: "#101015",
                    border: `1px solid ${d.titles >= 5 ? "rgba(245, 197, 24, 0.4)" : "#22222d"}`,
                    borderRadius: 6,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                      {d.driver} <small style={{ color: "#777", fontWeight: 400 }}>({d.nationality})</small>
                    </span>
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        fontFamily: "IBM Plex Mono, monospace",
                        color: d.titles >= 7 ? "#f5c518" : d.titles >= 4 ? "#00E5FF" : "#34d399",
                      }}
                    >
                      {d.titles}x 🏆
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: "#888", marginTop: 8, fontFamily: "IBM Plex Mono, monospace" }}>
                    TITLES: {d.years.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Constructor All-Time Title Rankings */}
          <div className="panel">
            <div className="panel-title">
              <div>
                <h2>CONSTRUCTORS' ALL-TIME CHAMPIONSHIP TITLES</h2>
                <span>TEAMS TO WIN THE INTERNATIONAL CUP FOR F1 CONSTRUCTORS</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, padding: "16px 20px" }}>
              {constructorTitles.map((c) => (
                <div
                  key={c.team}
                  style={{
                    background: "#101015",
                    border: `1px solid ${c.titles >= 10 ? "rgba(225, 6, 0, 0.4)" : "#22222d"}`,
                    borderRadius: 6,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{c.team}</span>
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        fontFamily: "IBM Plex Mono, monospace",
                        color: c.titles >= 10 ? "#e10600" : c.titles >= 6 ? "#00E5FF" : "#f5c518",
                      }}
                    >
                      {c.titles} Titles
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: "#777", marginTop: 6, fontFamily: "IBM Plex Mono, monospace" }}>
                    {c.years.slice(0, 8).join(", ")}
                    {c.years.length > 8 ? ` + ${c.years.length - 8} more` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
