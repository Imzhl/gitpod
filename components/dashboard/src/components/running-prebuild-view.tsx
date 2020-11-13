/**
 * Copyright (c) 2020 TypeFox GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License-AGPL.txt in the project root for license information.
 */

import { DisposableCollection, GitpodService, RunningWorkspacePrebuildStarting } from "@gitpod/gitpod-protocol";
import { HeadlessWorkspaceEventType } from '@gitpod/gitpod-protocol/lib/headless-workspace-log';
import Button from "@material-ui/core/Button";
import * as React from 'react';
import { Context } from '../context';
import { CubeFrame } from "./cube-frame";
import { WithBranding } from './with-branding';
import { WorkspaceLogView } from "./workspace-log-view";

export interface RunningPrebuildViewProps {
    service: GitpodService;
    prebuildingWorkspaceId: string;
    justStarting: RunningWorkspacePrebuildStarting;

    onIgnorePrebuild: () => void;
    onBuildDone: (didFinish: boolean) => void;
}

interface RunningPrebuildViewState {
    updateLoglineToggle?: boolean;
    errorMessage?: string;
}

export class RunningPrebuildView extends React.Component<RunningPrebuildViewProps, RunningPrebuildViewState> {
    protected logline: string | undefined;

    constructor(props: RunningPrebuildViewProps) {
        super(props);

        this.state = {};
        this.logline = `Workspace prebuild is ${this.props.justStarting} ...\r\n`;

        let buildIsDone = false;
        this.props.service.registerClient({
            onHeadlessWorkspaceLogs: evt => {
                if (evt.workspaceID !== this.props.prebuildingWorkspaceId) {
                    return;
                }

                this.logline = evt.text;
                this.setState({ updateLoglineToggle: !this.state.updateLoglineToggle });

                if (!buildIsDone && !HeadlessWorkspaceEventType.isRunning(evt.type)) {
                    buildIsDone = true;
                    this.props.onBuildDone(HeadlessWorkspaceEventType.didFinish(evt.type));
                }
            }
        });
    }

    private readonly toDispose = new DisposableCollection();
    componentWillMount() {
        const server = this.props.service.server;
        server.watchHeadlessWorkspaceLogs(this.props.prebuildingWorkspaceId);
        this.toDispose.push(server.onDidOpenConnection(() => server.watchHeadlessWorkspaceLogs(this.props.prebuildingWorkspaceId)));
    }
    componentWillUnmount() {
        this.toDispose.dispose();
    }

    public render() {
        const logline = this.logline;
        this.logline = undefined;
        return (
            <WithBranding service={this.props.service}>
                <Context.Consumer>
                    {(ctx) =>
                        <CubeFrame
                            errorMessage={this.state.errorMessage}
                            errorMode={!!this.state.errorMessage}
                            branding={ctx.branding}>
                            <div className="message action">
                                <Button className='button' variant='outlined' color='secondary' onClick={this.props.onIgnorePrebuild}>Skip Prebuild</Button>
                            </div>
                            <WorkspaceLogView content={logline} />
                        </CubeFrame>
                    }
                </Context.Consumer>
            </WithBranding>
        );
    }

}