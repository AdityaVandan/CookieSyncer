# CookieSyncer
A chrome extension to sync cookies across domains (especially UAT to local) for testing and development

## Installation
1. Go to chrome://extensions/, enable Developer mode
2. Click "Load unpacked" and upload the src folder
3. (Optional) Configure the URLs and cookie name in the popup


## Usage Instructions
1. After installation, input the source(UAT), destination(local) and cookie key name in the extension UI which look like the following image
2. You can either sync the cookie instantly with the button (Sync Cookie Now) click or have the extension listen to the change of the cookie on the source origin and sync it accordingly to the destination origin.

<img width="406" alt="image" src="https://github.com/user-attachments/assets/8a60757d-dcbe-40ee-ac4a-11034b83f483" />

