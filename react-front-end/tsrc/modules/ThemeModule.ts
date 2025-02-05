/*
 * Licensed to The Apereo Foundation under one or more contributor license
 * agreements. See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * The Apereo Foundation licenses this file to you under the Apache License,
 * Version 2.0, (the "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type { ThemeOptions } from "@material-ui/core";
import { createTheme } from "@material-ui/core/styles";
import { getRenderData } from "../AppConfig";
import * as OEQ from "@openequella/rest-api-client";

declare const themeSettings: OEQ.Theme.ThemeSettings;

const standardThemeSettings = (): ThemeOptions =>
  ({
    palette: {
      primary: {
        main: themeSettings.primaryColor,
      },
      secondary: {
        main: themeSettings.secondaryColor,
      },
      background: {
        default: themeSettings.backgroundColor,
        paper: themeSettings.paperColor,
      },
      text: {
        primary: themeSettings.primaryTextColor,
        secondary: themeSettings.menuTextColor,
      },
      menu: {
        text: themeSettings.menuItemTextColor,
        icon: themeSettings.menuItemIconColor,
        background: themeSettings.menuItemColor,
      },
    },
    typography: {
      useNextVariants: true,
      fontSize: themeSettings.fontSize,
    },
  } as ThemeOptions);

const renderData = getRenderData();

const autoTestOptions: ThemeOptions =
  typeof renderData == "object" && renderData.autotestMode
    ? {
        transitions: {
          create: () => "none",
        },
      }
    : {};

export const getOeqTheme = () =>
  createTheme({
    ...standardThemeSettings(),
    ...autoTestOptions,
  });
