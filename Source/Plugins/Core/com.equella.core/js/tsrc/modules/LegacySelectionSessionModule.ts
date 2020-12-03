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
import Axios from "axios";
import {
  API_BASE_URL,
  AppConfig,
  getRenderData,
  SelectionSessionInfo,
} from "../AppConfig";
import { LegacyContentResponse } from "../legacycontent/LegacyContent";

/**
 *  This Module is all about interacting with the Legacy AJAX endpoints
 *  for selections sessions, and will be used until the supporting REST
 *  endpoints are developed.
 */

/**
 * Provide a type to match 'CourseListFolderAjaxUpdateData' defined on server side.
 */
interface CourseListFolderAjaxUpdateData {
  /**
   * A list of IDs which represent DIVs that will need DOM manipulation once the ajax request is successful.
   * An example is 'courselistajax' which refers to the course list panel in Selection Session.
   */
  ajaxIds: string[];
  /**
   * The selected folder of a course list
   */
  folderId?: string;
  /**
   * An array where the first element is name of an event handler defined on server and the rest elements are
   * parameters passed to the handler. The handler name must this format: treeID.name.
   * An example is method 'selectItem' which takes two parameters: itemId and extensionType. So event should be
   * ["_slcl.selectItem", itemId, extensionType]
   */
  event: (string | null)[];
}

/**
 * The body structure of POST requests sent to 'searching.do' to select resources.
 */
export interface SelectionSessionPostData {
  /**
   * Which ajax events this request targets to
   */
  event__: string[];
  /**
   * The first parameter passed to the event handler
   */
  eventp__0: string[];
  /**
   * The second parameter which is ONLY used when Selection Session layout is 'search'.
   */
  eventp__1?: (string | null)[];
  /**
   * The third parameter which is ONLY used when Selection Session layout is 'search'.
   */
  eventp__2?: (string | null)[];
  /**
   * The ID of a Selection Session
   */
  "_sl.stateId": string[];
  /**
   * The ID of a LSM Integration
   */
  "_int.id"?: string[];
  /**
   * The Selection Session layout
   */
  a: string[];
}

/**
 * Defined in 'courselist.js', this variable provides functionality of manipulating the DOM of course list.
 */
declare const CourseList: {
  updateCourseList: (data: unknown) => void;
  prepareDraggableAndBind: (selector: string, forItem: boolean) => void;
  newSearchPageItemClass: string;
  newSearchPageAttachmentClass: string;
};

/**
 * Prepare draggables for Items and attachments. ONLY works for HTML elements that
 * have an ID.
 *
 * @param id A string representing a DOM element's ID.
 * @param forItem True if prepare draggables for Items
 */
export const prepareDraggable = (id: string, forItem = true) => {
  getGlobalCourseList().prepareDraggableAndBind(`#${id}`, forItem);
};

/**
 * The intention of having this function is to help Jest test mock CourseList.
 */
export const getGlobalCourseList = () => CourseList;

/**
 * When Selection Session is open, provide access to the CSS class 'newSearchPageItemClass'
 * defined in 'couselist.js'.
 */
export const getSearchPageItemClass = (): string =>
  isSelectionSessionInStructured()
    ? getGlobalCourseList().newSearchPageItemClass
    : "";

/**
 * When Selection Session is open, provide access to the CSS class 'newSearchPageAttachmentClass'
 * defined in 'couselist.js'.
 */
export const getSearchPageAttachmentClass = (): string =>
  isSelectionSessionInStructured()
    ? getGlobalCourseList().newSearchPageAttachmentClass
    : "";

/**
 * An internal Type guard used to check whether an object is of type SelectionSessionInfo.
 * @param data The data to be checked
 */
const isSelectionSessionInfo = (
  data: unknown
): data is { [K in keyof SelectionSessionInfo]: unknown } =>
  typeof data === "object" && data !== null && "stateId" in data;

/**
 * Returns true if the Selection Session info provided by renderData is neither null nor undefined.
 */
export const isSelectionSessionOpen = (): boolean =>
  isSelectionSessionInfo(getRenderData()?.selectionSessionInfo);

/**
 * Return true if Selection Session is in 'Structured'.
 */
export const isSelectionSessionInStructured = (): boolean => {
  if (isSelectionSessionOpen()) {
    return getSelectionSessionInfo().layout === "coursesearch";
  }
  return false;
};
/**
 * Indicates if the Select Summary button is disabled or not.
 * Returns true if the Selection Session info is not available.
 */
export const isSelectSummaryButtonDisabled = (): boolean => {
  const selectionSessionInfo = getRenderData()?.selectionSessionInfo;
  if (isSelectionSessionInfo(selectionSessionInfo)) {
    return selectionSessionInfo.isSelectSummaryButtonDisabled;
  }
  return true;
};

/**
 * Validate the selectionSessionInfo included in renderData.
 * And return selectionSessionInfo if the checking is passed, or throw a type error.
 */
const getSelectionSessionInfo = (): SelectionSessionInfo => {
  const selectionSessionInfo = getRenderData()?.selectionSessionInfo;
  if (isSelectionSessionInfo(selectionSessionInfo)) {
    return selectionSessionInfo;
  }
  throw new TypeError("The type of Selection Session Info is incorrect.");
};

const submitBaseUrl = `${API_BASE_URL}/content/submit`;

const getBasicPostData = () => {
  const { stateId, integId, layout } = getSelectionSessionInfo();
  const basicPostData = {
    "_sl.stateId": [`${stateId}`],
    a: [layout],
  };
  return integId
    ? { ...basicPostData, "_int.id": [`${integId}`] }
    : basicPostData;
};

/**
 * Send a POST request to submit selected resources.
 *
 * @param path URL of an endpoint for submitting selected resources
 * @param data Payload of the request
 * @param callback Function called when the request is successful
 */
const submitSelection = <T>(
  path: string,
  data: SelectionSessionPostData,
  callback: (result: T) => void
): Promise<void> => Axios.post(path, data).then(({ data }) => callback(data));

/**
 * Build a Selection Session specific ItemSummary Link. Recommended to first call `isSelectionSessionOpen()`
 * before use.
 * @param uuid The UUID of an Item
 * @param version The version of an Item
 */
export const buildSelectionSessionItemSummaryLink = (
  uuid: string,
  version: number
): string => {
  const { stateId, integId, layout } = getSelectionSessionInfo();
  const itemSummaryPageLink = AppConfig.baseUrl.concat(
    `items/${uuid}/${version}/?_sl.stateId=${stateId}&a=${layout}`
  );

  // integId can be null in 'Resource Selector'.
  if (integId) {
    return itemSummaryPageLink.concat(`&_int.id=${integId}`);
  }
  return itemSummaryPageLink;
};

/**
 * Build a Selection Session specific Remote search Link. Recommended to first call `isSelectionSessionOpen()`
 * before use.
 * @param uuid The UUID of a Remote search
 */
export const buildSelectionSessionRemoteSearchLink = (uuid: string): string => {
  const { stateId, integId } = getSelectionSessionInfo();
  const remoteSearchLink = AppConfig.baseUrl.concat(
    `access/z3950.do?.repository=${uuid}&uc=true&_sl.stateId=${stateId}`
  );

  if (integId) {
    return remoteSearchLink.concat(`&_int.id=${integId}`);
  }
  return remoteSearchLink;
};

/**
 * Build a Selection Session specific Advanced search Link. Recommended to first call `isSelectionSessionOpen()`
 * before use.
 * @param uuid The UUID of an Advanced search
 */
export const buildSelectionSessionAdvancedSearchLink = (
  uuid: string
): string => {
  const { stateId, integId } = getSelectionSessionInfo();
  const remoteSearchLink = AppConfig.baseUrl.concat(
    `advanced/searching.do?in=P${uuid}&editquery=true&_sl.stateId=${stateId}`
  );

  if (integId) {
    return remoteSearchLink.concat(`&_int.id=${integId}`);
  }
  return remoteSearchLink;
};

/**
 * Update the content of DIV "selection-summary". This function is primarily for
 * 'selectOrAdd' mode. In this mode, what is returned from 'searching.do' is an
 * object of 'LegacyContentResponse'.
 *
 * So we need to convert the HTML string to a Document, and then extract the content
 * of node "selection-summary", and lastly use jQuery to update the DOM.
 *
 * @param legacyContent An object of LegacyContentResponse returned from server
 */
const updateSelectionSummary = (legacyContent: LegacyContentResponse) => {
  const bodyContent = new DOMParser().parseFromString(
    legacyContent.html.body,
    "text/html"
  );
  const selectionSummary = bodyContent.getElementById("selection-summary");
  if (!selectionSummary) {
    throw new Error("Failed to update Selection Summary.");
  }
  $("#selection-summary").html(selectionSummary.innerHTML);
};

/**
 * Build an object of SelectionSessionPostData for 'structured'.
 */
export const buildPostDataForStructured = (
  itemKey: string,
  attachmentUUIDs: string[]
): SelectionSessionPostData => {
  const serverSideEvent: (string | null)[] =
    attachmentUUIDs.length > 0
      ? [
          "_slcl.selectAllAttachments",
          `${attachmentUUIDs.join(",")}`,
          `${itemKey}`,
          null,
        ]
      : ["_slcl.selectItem", `${itemKey}`, null];

  const courseListUpdateData: CourseListFolderAjaxUpdateData = {
    ajaxIds: ["courselistajax"],
    event: serverSideEvent,
  };

  return {
    event__: ["_slcl.reloadFolder"], // This refers to the method 'reloadFolder' defined in 'CourseListSection'.
    eventp__0: [`${JSON.stringify(courseListUpdateData)}`],
    ...getBasicPostData(),
  };
};

/**
 * Build an object of SelectionSessionPostData for 'selectOrAdd'.
 */
export const buildPostDataForSelectOrAdd = (
  itemKey: string,
  attachmentUUIDs: string[]
): SelectionSessionPostData =>
  attachmentUUIDs.length > 0
    ? {
        event__: [`ilad.selectAttachmentsFromNewSearch`],
        eventp__0: [attachmentUUIDs.join(",")],
        eventp__1: [`${itemKey}`],
        eventp__2: [null],
        ...getBasicPostData(),
      }
    : {
        event__: ["sile.select"],
        eventp__0: [`${itemKey}`],
        eventp__1: [null],
        ...getBasicPostData(),
      };

/**
 * Select resources in 'structured'. The approach is to call the server AJAX method 'reloadFolder'
 * which is defined in 'CourseListSection'. The parameter passed to this method is a JSON string
 * converted from an object of 'CourseListFolderAjaxUpdateData'.
 */
export const selectResourceForCourseList = (
  itemKey: string,
  attachmentUUIDs: string[] = []
): Promise<void> => {
  const postData: SelectionSessionPostData = buildPostDataForStructured(
    itemKey,
    attachmentUUIDs
  );

  return submitSelection<unknown>(
    `${submitBaseUrl}/access/course/searching.do`,
    postData,
    getGlobalCourseList().updateCourseList
  );
};

/**
 * Select resources in 'selectOrAdd'. The approach is similar to 'selectResourceForCourseList'.
 * The difference is we call the server event handlers directly. Details of those handlers can
 * be found from 'AbstractAttachmentsSection' and 'AbstractSelectItemListExtension'.
 */
export const selectResourceForNonCourseList = (
  itemKey: string,
  attachmentUUIDs: string[]
): Promise<void> => {
  const postData: SelectionSessionPostData = buildPostDataForSelectOrAdd(
    itemKey,
    attachmentUUIDs
  );

  return submitSelection<LegacyContentResponse>(
    `${submitBaseUrl}/selectoradd/searching.do`,
    postData,
    updateSelectionSummary
  );
};

/**
 * Submit a request to select an ItemSummary page, an attachment or all attachments of an Item.
 * @param itemKey The unique key including the selected Item's UUID and version
 * @param attachments A list of UUIDs of selected attachments
 */
export const selectResource = (
  itemKey: string,
  attachments: string[]
): Promise<void> => {
  const { layout } = getSelectionSessionInfo();
  return layout === "coursesearch"
    ? selectResourceForCourseList(itemKey, attachments)
    : selectResourceForNonCourseList(itemKey, attachments);
};
