# Final Project INFOMVIS

*Web-based visualization tool for the Naturvation Atlas*

Team members: 
- Kasper van der Pol
- Chang He
- Prabhjot Singh
- Nicky Chen

## Abstract

This project presents an interactive, web-based decision-support dashboard built on data from the Naturvation Atlas, designed to support real estate developers in evaluating and comparing urban development projects with a focus on nature-based solutions. The dashboard enables decision-making by combining coordinated visualizations, interactive filtering, and comparative analysis.

Users can filter projects by certain variables like location, start- & end year range, economic impacts, funding sources, and additional attributes to narrow down relevant development opportunities. A choropleth renders all countries to provide an overview of the project distribution across all countries. The user can also switch to a city view, which renders a bubble map, where each dot represents a city and the size is determined by the total projects. The user can also change the decision variables of total projects to average area or cost. The user can also choose between the same decision variables for another visualization, which renders a bar chart based on the funding sources. A line chart reveals trends over project activity over time. To further aid decision-making, the dashboard includes a similarity analysis that allows users to select a reference project from a world map and explore how other projects across different regions compare in terms of key attributes. 

By integrating multiple coordinated views and interactive exploration mechanisms, the system supports the intelligence and choice stages of decision-making, helping real estate developers identify patterns, evaluate trade-offs, and compare development alternatives in a transparent and data-driven manner.

## Code

### Dependencies

- **[D3.js](https://github.com/d3/d3):** To render visualizations
- **[Topojson](https://github.com/topojson/topojson):** For parsing the GIS data 
- **[Leaflet.js](https://leafletjs.com/):** To render maps
- **[Bootstrap Icons](https://icons.getbootstrap.com/):** The table has a sort icon, for which Bootstrap (icons) is used
- **[Tom select](https://github.com/orchidjs/tom-select):** Certain inputs are a bit more complicated, they have a search function or can have multiple values (from a set of pre-defined values). By using tom select, it is easier to realise that.
- **[Range-slider-input](https://github.com/n3r4zzurr0/range-slider-input):** A range slider allows the end user to filter the year and NbS area in an userfriendly way.

> All dependencies are included as a CDN

### Structure

The website has 2 starting points; `index.html` & `similarity_band.html`, both rendering their own and some shared visualizations. To avoid code redundancy, this project makes use of reusable components. A component can contain some HTML, CSS and JavaScript code. 

The way this works, is that both entry-html files import the boot file, the boot file contains a function called `boot` and a list of all components and where all the files, such as HTML, CSS and Javascript files are stored in. When calling `boot`, a string is given as parameter, which decides what components should render. Another function takes in all the file links and adds them to the DOM.

Apart from `boot.js`, there's another shared file, `main.js`, this contains a class with contains some logic that is the same for both pages, like fetching the data and updating the components. Both files then include their own `js`-file with their own class, this class derives from the main class and aditionally it can update the components which are not shared.

Such a structure allows to make changes in 1 component, without any side-effects in another component. This also allows to avoid code redundancy and makes the code more structured without using a framework. 

### How to run

1. Clone the repository

1. Make sure that there is a data folder in the root of the project, including the correct csv-file. The csv-file can be found in the zip-file, so it should be already there if it is not cloned from GitHub. You can also run the data-wrangle script yourself, but then you still need the raw excel sheet.

1. Open a webserver on the root of the project. Make sure that it is actually the root of the project, because the data files are in another folder.

1. Navigate to https://localhost:5500/code/webapp/index.html in any webbrowser, with the correct port

## Data wrangling

The data wrangling is done with Python, the python script can be found under the folder `code > data wrangling scripts`. Several dependencies are used to make sure that the excel sheet is converted to a CSV-file. An example is fetching the coordinates, so the project can render a world map.

To run the script, simply call python with the correct filename.

For an exact overview on what is done for the data wrangling part, refer to the report document.
