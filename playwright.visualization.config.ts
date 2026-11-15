import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests/visualization/browser',testMatch:'**/*.spec.ts',workers:1,timeout:45000,use:{baseURL:'http://127.0.0.1:3000',browserName:'chromium',trace:'retain-on-failure'},webServer:{command:'npm run dev -- --hostname 127.0.0.1 --port 3000',url:'http://127.0.0.1:3000',reuseExistingServer:true,timeout:60000}});
