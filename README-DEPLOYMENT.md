# Deployment Guide

This document explains how to run the MSC Trust Inventory system automatically on your Windows machine without needing to open a terminal or run commands manually.

## How to Start the Server Manually

Inside the project folder (`C:\Users\lanib\OneDrive\Documents\MSC TRUST PROJECT\New folder\msc-trust-inventory`), you will find a file named `start-server.bat`. 

To start the system:
1. Simply double-click the `start-server.bat` file.
2. A black window may briefly flash, and the server will start running silently in the background.
3. You can then open your web browser and go to `http://localhost:3000` to access the system.

## Where is the Log File?

Because the server runs silently in the background, you won't see a black terminal window with text flying by. Instead, all activity, errors, and access records are saved directly into a text file.

- **Location:** The log file is located in the project folder and is named `server-log.txt`.
- **Purpose:** If the system ever crashes, fails to load, or stops working, you or a technician can open this file to see exactly what went wrong. The file appends new information at the bottom every time the server runs, so old history is never lost.

## Automatic Startup Configuration

For a truly unattended deployment, this system should start automatically whenever the Windows computer is turned on or rebooted. 

**Important Note:** The `start-server.bat` script is designed for this, but it **must be registered in Windows Task Scheduler manually** on the physical machine. 

To do this:
1. Open the **Windows Task Scheduler** application.
2. Click **Create Basic Task...** and name it "MSC Inventory Server".
3. Choose the trigger **"When the computer starts"** (or "When I log on").
4. Choose the action **"Start a program"**.
5. Browse and select the `start-server.bat` file located in this folder.
6. Save the task.

Once registered, the server will start up silently in the background on its own every time the computer powers on, ensuring uninterrupted access to the inventory system.
