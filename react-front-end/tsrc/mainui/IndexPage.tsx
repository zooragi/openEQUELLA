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
import * as OEQ from "@openequella/rest-api-client";
import * as React from "react";
import {
  BrowserRouter,
  Prompt,
  Redirect,
  Route,
  RouteComponentProps,
  Switch,
} from "react-router-dom";
import { shallowEqual } from "shallow-equal-object";
import { ErrorResponse } from "../api/errors";
import { getRenderData, getRouterBaseName, LEGACY_CSS_URL } from "../AppConfig";
import { LegacyContent } from "../legacycontent/LegacyContent";
import { getCurrentUserDetails } from "../modules/UserModule";
import ErrorPage from "./ErrorPage";
import { defaultNavMessage, NavAwayDialog } from "./PreventNavigation";
import {
  BaseOEQRouteComponentProps,
  isNewUIRoute,
  OEQRouteNewUI,
  routes,
} from "./routes";
import { Template, TemplateProps, TemplateUpdate } from "./Template";

const SearchPage = React.lazy(() => import("../search/SearchPage"));

const renderData = getRenderData();

const beforeunload = function (e: BeforeUnloadEvent) {
  e.returnValue = "Are you sure?";
  return "Are you sure?";
};

const removeLegacyCss = (): void => {
  const head = document.getElementsByTagName("head")[0];
  const legacyCss = window.document.querySelector(
    `link[href="${LEGACY_CSS_URL}"]`
  );
  if (legacyCss) {
    head.removeChild(legacyCss);
  }
};

export default function IndexPage() {
  const [currentUser, setCurrentUser] =
    React.useState<OEQ.LegacyContent.CurrentUserDetails>();
  const [fullPageError, setFullPageError] = React.useState<ErrorResponse>();
  const errorShowing = React.useRef(false);

  const refreshUser = React.useCallback(() => {
    getCurrentUserDetails().then(setCurrentUser);
  }, []);

  React.useEffect(() => refreshUser(), [refreshUser]);

  const [navAwayCallback, setNavAwayCallback] = React.useState<{
    message: string;
    cb: (confirm: boolean) => void;
  }>();

  const [preventNavMessage, setPreventNavMessage] = React.useState<string>();

  const [templateProps, setTemplateProps] = React.useState<TemplateProps>({
    title: "",
    fullscreenMode: "NO", // Match default on the server to avoid superfluous template updates
    children: [],
  });

  const setPreventNavigation = React.useCallback(
    (prevent) => {
      const message = prevent ? defaultNavMessage() : undefined;
      if (message) {
        window.addEventListener("beforeunload", beforeunload, false);
      } else {
        window.removeEventListener("beforeunload", beforeunload, false);
      }
      setPreventNavMessage(message);
    },
    [setPreventNavMessage]
  );

  const nonBlankNavMessage = preventNavMessage ? preventNavMessage : "";

  const updateTemplate = React.useCallback((edit: TemplateUpdate) => {
    setTemplateProps((tp) => {
      const edited = edit(tp);
      return shallowEqual(edited, tp) ? tp : edited;
    });
  }, []);

  const mkRouteProps = React.useCallback(
    (p: RouteComponentProps): BaseOEQRouteComponentProps => ({
      ...p,
      updateTemplate,
      refreshUser,
      redirect: p.history.push,
      setPreventNavigation,
      isReloadNeeded: !renderData?.newUI, // Indicate that new UI is displayed but not enabled.
    }),
    [refreshUser, setPreventNavigation, updateTemplate]
  );

  const newUIRoutes = React.useMemo(
    () =>
      Object.keys(routes)
        .map<OEQRouteNewUI | undefined>((name) => {
          // @ts-ignore:  Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'Routes'
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const maybeRoute: any = routes[name];
          return isNewUIRoute(maybeRoute) ? maybeRoute : undefined;
        })
        .filter((maybeRoute): maybeRoute is OEQRouteNewUI => !!maybeRoute)
        .map((oeqRoute: OEQRouteNewUI, ind) => (
          <Route
            key={ind}
            path={oeqRoute.path}
            render={(p) => {
              const oeqProps = mkRouteProps(p);
              if (oeqRoute.component) {
                return <oeqRoute.component {...oeqProps} />;
              }
              return oeqRoute.render?.(oeqProps);
            }}
          />
        )),
    [mkRouteProps]
  );

  const errorCallback = React.useCallback((err: ErrorResponse) => {
    errorShowing.current = true;
    setTemplateProps((p) => ({ ...p, fullscreenMode: undefined }));
    setFullPageError(err);
  }, []);

  const routeSwitch = () => {
    const oldSearchPagePath = "/searching.do";
    const newSearchPagePath = "/page/search";
    const newAdvancedSearchPagePath = "/page/advancedsearch/";

    const renderLegacyContent = (p: RouteComponentProps) => {
      return (
        <LegacyContent
          {...mkRouteProps(p)}
          search={p.location.search}
          pathname={p.location.pathname}
          locationKey={p.location.key}
          onError={errorCallback}
        />
      );
    };

    // If the URL is the new Advanced Search path, get ID from the path.
    // If it's the old one, get ID from query param.
    const getAdvancedSearchIdFromLocation = (
      location: Location
    ): string | undefined => {
      if (location.pathname.match(newAdvancedSearchPagePath)) {
        const advancedSearchPagePath = /(.+)(\/page\/advancedsearch\/)(.+)/;
        // The third group is the UUID, and use `reverse` to destructure the array.
        const [advancedSearchId] =
          window.location.pathname.match(advancedSearchPagePath)?.reverse() ??
          [];

        return advancedSearchId;
      }

      const currentParams = new URLSearchParams(location.search);
      const legacyAdvancedSearchId = currentParams.get("in");
      return legacyAdvancedSearchId?.startsWith("P")
        ? legacyAdvancedSearchId.substring(1)
        : undefined;
    };
    return (
      <Switch>
        {fullPageError && (
          <Route>
            <ErrorPage error={fullPageError} />
          </Route>
        )}
        <Route path="/" exact>
          <Redirect to="/home.do" />
        </Route>
        {newUIRoutes}
        <Route
          path={[
            oldSearchPagePath,
            newSearchPagePath,
            newAdvancedSearchPagePath,
          ]}
          render={(p) => {
            const newSearchEnabled: boolean =
              typeof renderData !== "undefined" && renderData?.newSearch;
            const location = window.location;
            if (
              location.pathname.match(newSearchPagePath) ||
              newSearchEnabled
            ) {
              removeLegacyCss();
              return (
                <SearchPage
                  {...mkRouteProps(p)}
                  advancedSearchId={getAdvancedSearchIdFromLocation(location)}
                />
              );
            }
            return renderLegacyContent(p);
          }}
        />
        <Route render={renderLegacyContent} />
      </Switch>
    );
  };

  return (
    <BrowserRouter
      basename={getRouterBaseName()}
      getUserConfirmation={(message, cb) => {
        if (errorShowing.current) {
          errorShowing.current = false;
          setFullPageError(undefined);
          cb(true);
        } else {
          setNavAwayCallback({ message, cb });
        }
      }}
    >
      <Prompt
        when={Boolean(preventNavMessage) || errorShowing.current}
        message={nonBlankNavMessage}
      />
      <NavAwayDialog
        open={Boolean(navAwayCallback)}
        message={nonBlankNavMessage}
        navigateConfirm={(confirm) => {
          if (navAwayCallback) navAwayCallback.cb(confirm);
          if (confirm) setPreventNavMessage(undefined);
          setNavAwayCallback(undefined);
        }}
      />
      <Template {...templateProps} currentUser={currentUser}>
        {routeSwitch()}
      </Template>
    </BrowserRouter>
  );
}
