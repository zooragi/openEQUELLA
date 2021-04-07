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
import * as React from "react";

export interface YouTubeEmbedProps {
  /**
   * The dimensions (in pixels) for the `iframe` embedding the YouTube player.
   */
  dimensions?: {
    /**
     * The height (in pixels) for the `iframe` embedding the YouTube player.
     */
    height: number;
    /**
     * The width (in pixels) for the `iframe` embedding the YouTube player.
     */
    width: number;
  };

  /**
   * The YouTube video's Id - often from the end of a view URL (i.e.
   * `videoId` from `https://www.youtube.com/watch?v=<videoId>`)
   */
  videoId: string;
}

/**
 * A simple component for the embedding of a YouTube video using the standard YouTube embed code
 * - well as at April 2021.
 */
const YouTubeEmbed = ({ dimensions, videoId }: YouTubeEmbedProps) => (
  <iframe
    width={dimensions?.width ?? 560}
    height={dimensions?.height ?? 315}
    src={`https://www.youtube-nocookie.com/embed/${videoId}`}
    title="YouTube video player"
    frameBorder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowFullScreen
  />
);

export default YouTubeEmbed;
