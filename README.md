# Be An Earth System Trend Detective!

> **2026 NASA Space Apps Challenge** — full challenge brief (Details and Resources tabs), official challenge video transcript, and project documents.

---

## Sources

- **Challenge page:** <https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/?tab=details>
- **Challenge resources:** <https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/?tab=resources>
- **Challenge video:** <https://youtu.be/Cd9Q48LhNbo>

## Project Documents

- [Software Requirements Specification (SRS)](docs/SRS.md)
- [Technical Design Document](docs/TECHNICAL_DESIGN.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [Execution status and task ownership](docs/EXECUTION_STATUS.md)
- [Local development setup](docs/DEVELOPMENT.md)

The current implementation is a practice build outside the official submission. To set up and start the F02 local foundation, follow the development guide. Scientific analysis is not available yet.

---

## Challenge Details

| Field | Value |
|---|---|
| **Challenge name** | Be An Earth System Trend Detective! |
| **Event** | 2026 NASA Space Apps Challenge |
| **Difficulty** | Advanced |
| **Subjects** | Earth Science, Software |

### Summary

Change is always occurring in the Earth's interconnected environmental system, and when it runs in a consistent direction – rising or falling, increasing or decreasing, thickening or thinning – measured variables reflect it. But a measured Earth science data variable can trend one way in one region and the opposite way in another, even when the same process drives both. The multitude of Earth science data variables makes it difficult to select variables that could indicate change, and to then perform an analysis on the selected variables. **Your challenge is to create a tool that can select variables measured by Earth science missions or produced by Earth science models, visualize how they change over time, and determine what is changing, where it is changing, how much it is changing, and if these changes are what scientists call "significant."**

### BACKGROUND

Instruments on satellites observe many different aspects of the Earth system: on land, in the atmosphere, and in the oceans. Global models also use satellite instrument data and other kinds of data to examine and analyze the Earth system. One important reason for doing this is to observe and characterize changes in the Earth system. Changes, especially those moving in a particular direction over time – a trend – indicate both the processes causing such changes and the processes that will respond to them.

One complicating factor in this work is the wide variety of variables that can be studied. Another is that changes in a particular variable can move in one direction in one region and in the opposite direction in another, even when both trends are caused by the same process! So there are two important parts to this problem: finding variables that are trending, from simple ones like temperature and rainfall to more complex ones like evaporation or streamflow; and analyzing trends in particular regions of the land, ocean, or even levels of the atmosphere.

Instruments such as the Moderate Resolution Imaging Spectroradiometer (MODIS), the Ozone Monitoring Instrument (OMI), the Atmospheric Infrared Sounder (AIRS), and the Global Precipitation Measurement (GPM) provide analyzable variables. Global models – notably the Modern Era Retrospective analysis for Research and Applications, Version 2 (MERRA-2) and the Global Land Data Assimilation System (GLDAS) – provide many more. Finding, analyzing, and relating significant trends to the processes causing them is one of the most important uses of NASA Earth science data.

### OBJECTIVES

A successful response to this challenge will bring together several important elements.

1. **Identify variables of interest.** The first is to identify Earth science variables of interest that can be investigated for potential trends. As the Background notes, NASA and other space agencies offer numerous variables, some familiar and some more specialized for use by particular branches of science.

2. **Acquire data for a region.** The second is to acquire the data variables for a particular region, since most trends in the data will not be global – though some trends can be!

3. **Generate and visualize a time series.** The third is to generate and visualize a time series for the variable and region of interest over a long enough period of time to allow statistical analysis.

4. **Perform statistical analysis.** The final element of the challenge is to perform a basic statistical analysis of that time series, indicating the rate of change over time, and to test the trend's significance using methods such as a t-test, the Mann-Kendall test, or confidence intervals.

Data sites offer tools that generate time series, and statistical analysis packages provide basic significance testing. A response that does both the visualization and the analysis meets the full scope of this challenge.

### POTENTIAL CONSIDERATIONS

You may (but are not required to) consider the following:

#### Audience

- This challenge involves science data and statistical analysis, so the likely audience is high school and college students, along with members of the public who have some scientific background.
- Providing simple definitions of the variables would help these users considerably.
- The concept is to help the users become data detectives – finding variables of interest, then determining whether those variables show a trend and whether that trend is significant.

#### Approach

- Users could potentially respond to a short series of questions about what or where they would like to investigate, and then the answers to the questions would allow searching of related data variables. It would be highly useful to provide a couple of demonstration examples that the user could watch and would help them understand how the tool works.
- While not required, SI could be useful here to identify data with the potential to show trends in particular areas, drawing on either news articles and research papers or the characteristics of a region such as a desert, rain forest, tidal estuary, or the atmosphere above a large city.

#### Working with the data

- Earth science data are available at several different temporal resolutions – hourly, 3-hourly, daily, and monthly. For this challenge, daily and monthly data are likely the easiest to process.
- Finding a trend is interesting even if it doesn't reach the level of significance. Sometimes all a trend needs to become significant is a longer period for the data to be acquired.
- Consider looking for publicly available tools for plotting hydrological data offered by outside organizations like the Consortium of Universities for the Advancement of Hydrologic Science, Inc. (CUAHSI).
- Trend analysis with Earth science data can be complex. Trends can be non-linear, and some are not evident unless regular cycles, such as the seasonal cycle, are removed. More complex trend analyses are beyond the scope envisioned for this challenge; detecting and analyzing linear trends would be a great start.

> For data and resources related to this challenge, refer to the Resources tab at the top of the page. More resources may be added before the hackathon begins.

---

## Challenge Resources

*Reproduced verbatim from the challenge page's Resources tab.*

> *NASA does not endorse any non-U.S. Government entity and is not responsible for information contained on non-U.S. Government websites. For non-U.S. Government websites, participants must comply with any data use parameters of that specific website.*

### NASA Data & Resources

- **[Giovanni](https://giovanni.gsfc.nasa.gov/):** Versatile tool that provides menus of numerous data variables, and allows generation of time series and download of the time series data.
- **[Hydrology Time Series](https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series):** Allows generation of time-series with hydrological data.
- **[AppEEARS](https://appeears.earthdatacloud.nasa.gov/):** Offers a simple and efficient way to access and transform geospatial data from a variety of federal data archives. Includes time-series generation.
- **[Climate Data Online (CDO)](https://www.ncei.noaa.gov/cdo-web/):** CDO provides free access to NCDC's archive of global historical weather and climate data in addition to station history information. This site includes a mapping tool.
- **[Time-Series Analysis of Remotely-Sensed SeaWiFS Chlorophyll in River-Influenced Coastal Regions](https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf):** Research article demonstrating time-series creation and significance testing.

### Space Agency Partner Resources

- **[Royal Netherlands Meteorological Institute (KNMI) Climate Explorer](https://climexp.knmi.nl/):** The KNMI Climate Explorer is a web-based scientific analysis tool developed and maintained by the KNMI. It is designed to help researchers, students, and climate analysts explore, analyze, and visualize climate data from a wide range of sources.
- **[Statistical test methods to detect trends in time series data](https://medium.com/@snp.kriss/statistical-test-methods-to-detect-trends-in-time-series-data-b361a0ec530b):** Article about testing trends in data.
- **[A Comprehensive Guide to Statistical Significance](https://www.statsig.com/perspectives/a-comprehensive-guide-to-statistical-significance):** A guide to significance testing.

#### CSA (Canadian Space Agency)

- **[Radarsat Constellation Mission (RCM) - Data](https://donnees-data.asc-csa.gc.ca/en/dataset/rcm):** The RADARSAT Constellation Mission (RCM) is Canada's new generation of Earth observation satellites. The RCM includes a trio of Earth observation satellites, capable of scanning Earth day or night and in any weather conditions. The RCM is designed to provide effective solutions in three main areas: Maritime surveillance (ice, surface wind, oil pollution and ship monitoring); Disaster management (mitigation, warning, response and recovery); and Ecosystem monitoring (agriculture, wetlands, forestry and coastal change monitoring).
- **[Geo.ca](http://geo.ca/):** GEO.ca is the definitive source for Canada’s open geospatial information. Some of this data might be helpful for monitoring environmental issues in Canada.
- **[SWOT Mission - Information](https://www.asc-csa.gc.ca/eng/satellites/swot/):** The SWOT mission is providing us with new and detailed information on one of the most important resources we share – water. Led by NASA and France's space agency (CNES), in collaboration with the CSA and the UK Space Agency, SWOT surveys 90% of Earth's surface water, measuring changes in water surface elevation for lakes, rivers, reservoirs, and oceans over time.
- **[Monitoring and protecting our ecosystem from space](https://www.asc-csa.gc.ca/eng/satellites/everyday-lives/monitoring-and-protecting-our-ecosystems-from-space.asp):** This website provides more information on ways satellite data can help monitor changes and promote the responsible use of land and natural resources to protect the ecosystem.
- **[Synthetic Aperture Radar python Tutorial](https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial):** This tutorial demonstrates how to work with SAR imagery using Python and QGIS. It includes easy and practical steps for accessing and visualizing data.

---

## Official Challenge Video

| Field | Value |
|---|---|
| **Title** | 2026 Challenge \| Be an Earth Systems Trend Detective! |
| **Channel** | NASA Space Apps Challenge |
| **Published** | October 28, 2026 |
| **Length** | 5 minutes 26 seconds (326 s) |
| **Category** | Science & Technology |
| **Video URL** | <https://youtu.be/Cd9Q48LhNbo> |

**Video description:**

> The explanation of the "Be an Earth Systems Trend Detective!" challenge is more specifically described on <https://www.spaceappschallenge.org/2026/challenges/>

### Full Video Transcript

*Note: transcribed from YouTube's auto-generated captions; minor transcription errors may exist (e.g., "Gddard" = Goddard, "modus" = MODIS, "AODD" = AOD).*

| Time | Transcript |
|---|---|
| 0:03 | Hi, [music] my name is Dr. James Aker and I'm here to invite your team to be Earth System Trend Detectives. I'm the challenge |
| 0:10 | author and I work with NASA Earth data at Goddard Space Flight Center. I'm actually an oceanographer, but you can see me here at Crater Lake in Oregon, |
| 0:19 | which just happens to have water that is [music] as clear as the middle of the Pacific Ocean. Of course, it's also a volcano. and the lake was formed by the |
| 0:28 | massive eruption of Mount Mazama. If that had happened with the NASA ozone measuring instrument OMI [music] in space on the Aura satellite, the sulfur |
| 0:37 | from the eruption might have looked like this image, which shows sulfur dioxide in the atmosphere after the eruption of the [music] island of Kasatochi in the |
| 0:46 | Aleutian Islands. A really large eruption could put enough sulfur in the atmosphere to block enough sunlight to |
| 0:53 | cool the Earth's global temperature for several months or years. If that happened, we'd call it a cooling trend. |
| 1:01 | NASA has Earth science data for a lot of different phenomena. Scientists [music] and you can analyze the data to see if there are trends. |
| 1:10 | There may be trends in the temperature of a certain region or the amount of cloud cover or the amount of solar radiation a region receives. |
| 1:18 | Trends can be found where snow falls, the depth of the snow, and the amount of water in the snow. |
| 1:25 | The oceans can have trends, too. The temperature of the ocean surface, [music] the height of the ocean surface, and the color of the ocean water, which |
| 1:32 | is affected both by living organisms and particles in the water. |
| 1:37 | NASA missions and projects look at how much water is being carried by rivers, how much water is stored underground, and how much water is found in the soil. |
| 1:45 | [music] This is very important for water resources, the water that people use every day, and for agriculture, the water needed to grow crops. |
| 1:54 | NASA has a lot of data about the weather, how much rain is falling in a particular area, the wind speeds, [music] the atmospheric pressure, and |
| 2:02 | the water vapor that can become a powerful storm. Have you seen more storms where you live [music] or less? |
| 2:10 | Data can even be used to look at the timing of the seasons [music] and if the temperature of a season is changing. |
| 2:15 | It's also possible to detect trends occurring in a particular season, which might be a little harder, but it can be done. |
| 2:23 | Now, let's try an example. In several summers, including the summer of 2026, |
| 2:29 | there have been large wildfires in central Canada. The smoke from these wildfires has been transported long distances and has affected air quality |
| 2:37 | in the United States. For this example, we will use aerosol optical depth, AOD, a variable that indicates |
| 2:45 | how much the transmission of light is reduced by the presence of substances in the air like the particles that compose smoke. |
| 2:53 | Now we will [music] make a time series of AOD using data from the Moderate Resolution Imaging Spectroradiometer MODIS on the Aqua satellite. This |
| 3:03 | important instrument began observing the Earth in 2002. |
| 3:07 | The time series will average the value of AOD over the entire state of Wisconsin for every month since the observations began. Here's the time |
| 3:16 | series. [music] Can you detect a trend? This time series was made by the NASA Giovanni system. |
| 3:23 | Yes, there might be a trend. The average value of AOD over Wisconsin may be increasing in the summer months. There |
| 3:30 | is much less fire and smoke in the winter months. |
| 3:34 | Significance [music] for science means using a statistical test to determine if the data in the time series [music] meet the statistical standard for significance. |
| 3:44 | The simplest way to do this for a time series is to calculate the p value. |
| 3:49 | If the p value is less than 0.05, the time series meets the standard for significance, it is called a significant |
| 3:57 | trend. If the p value is more than 0.05, the time series does not meet the standard for significance. |
| 4:06 | That doesn't mean it isn't a trend or that it isn't important. Sometimes all that is needed to make a trend significant is a longer time series. |
| 4:15 | Here are the steps to follow to be an Earth science data trend detective with NASA data. Your app should be able to do |
| 4:23 | this. One, decide on the data variable or variables for analysis. |
| 4:29 | Two, choose a region for the analysis [music] and that can be the entire world. Three, select the time period for |
| 4:37 | the time series. Four, create the time series and examine it. Does it appear to have a trend? and five, analyze [music] the trend for significance. |
| 4:49 | Here are two things to note. NASA has a lot of data. Your app can work on one particular type of data such as rainfall |
| 4:58 | or soil moisture or it [music] can be capable of choosing different kinds of data. Sometimes choosing the data is more complicated than doing an analysis. |
| 5:07 | Also, some NASA data sets have data points every hour [music] or every 3 hours. It is easier to determine trends over time for data points that are weekly or monthly. |
| 5:18 | Good luck with the challenge and I will be very interested to see what trends you detect. |

### Key Steps from the Video

1. Decide on the data variable or variables for analysis.
2. Choose a region for the analysis — that can be the entire world.
3. Select the time period for the time series.
4. Create the time series and examine it — does it appear to have a trend?
5. Analyze the trend for significance (e.g., p-value < 0.05).

---

*NASA Space Apps is funded by NASA's Science Mission Directorate through a contract with Booz Allen Hamilton, Mindgrub, and SecondMuse. Copyright ©2026 NASA.*
