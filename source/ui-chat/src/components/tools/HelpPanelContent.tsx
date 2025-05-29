// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import HelpPanel from '@cloudscape-design/components/help-panel';

export const NoHelp = () => (
    <HelpPanel header={<h2>Help panel</h2>}>
        <p>There is no help content available for this page. </p>
    </HelpPanel>
);

export const HomeHelp = () => (
    <HelpPanel header={<h2>Dashboard</h2>}>
        <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent suscipit sapien lacus, nec sagittis erat
            ullamcorper vel. Mauris placerat arcu velit, id accumsan ipsum egestas eu. Maecenas rutrum dapibus neque,
            sit amet gravida ante cursus a. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere
            cubilia curae; Vestibulum ac dictum turpis, nec auctor justo. Curabitur tincidunt ipsum ac massa pulvinar,
            et condimentum elit viverra. Aliquam blandit condimentum ex a sollicitudin.
        </p>
        <p>
            Quisque tempus in sapien quis aliquam. Aliquam vitae sollicitudin ligula. Quisque ex neque, dignissim nec
            quam a, eleifend rutrum turpis. Quisque non nulla dapibus, tristique mi a, commodo dui. Ut pharetra ante id
            elit feugiat, lacinia tincidunt ipsum efficitur. Cras lobortis, est nec scelerisque dignissim, velit lacus
            commodo arcu, id dapibus arcu turpis ut augue. In id auctor ligula. Nulla consectetur sodales sapien, sed
            convallis ligula finibus vitae. Ut viverra non nulla quis congue. Pellentesque eget egestas metus, sit amet
            convallis felis. Donec massa nibh, fringilla vitae scelerisque in, elementum quis libero. Morbi augue augue,
            interdum ultricies sapien non, consequat euismod purus. Vestibulum et tellus sit amet orci scelerisque
            malesuada.
        </p>
        <p>
            Vivamus consequat fermentum purus ac malesuada. Curabitur accumsan lectus tellus. Cras condimentum hendrerit
            mi eu dapibus. Phasellus dapibus massa sapien, a efficitur odio lobortis nec. Praesent lacinia sollicitudin
            tortor, quis tempor lacus maximus a. Donec iaculis iaculis consectetur. Pellentesque dapibus, elit quis
            suscipit pellentesque, nisl ipsum molestie urna, sed luctus sem ante a lorem. Nam vestibulum volutpat ligula
            ac scelerisque. Morbi ac augue quis massa tincidunt sagittis ac et ligula. Proin cursus neque nec arcu
            suscipit, ac vulputate dolor auctor.
        </p>
    </HelpPanel>
);

export const ProjectsOverviewHelp = () => {
    return (
        <HelpPanel header={<h2>Projects Overview</h2>}>
            <p>This page lists all projects that exist in the system. </p>
            <ul>
                <li>Foo</li>
                <li>Bar</li>
                <li>Baz</li>
            </ul>
        </HelpPanel>
    );
};

export const ProjectsDetailsHelp = () => (
    <HelpPanel header={<h2>Projects Details</h2>}>
        <p>This page shows the details of the selected project.</p>
        <p>
            Vivamus iaculis bibendum malesuada. Ut efficitur nunc in pellentesque faucibus. Quisque elit dolor,
            sollicitudin eget quam nec, fringilla dignissim lorem. Fusce eget mi cursus, posuere leo et, molestie
            turpis. Nullam id tempor velit, eget pulvinar nulla. Aliquam sit amet convallis turpis, id posuere orci. Sed
            mollis aliquam ligula, in blandit justo. Aenean sed dictum risus. Aenean ullamcorper metus at magna
            vulputate, at finibus purus mollis. Pellentesque tempor id lectus quis tristique. Phasellus finibus interdum
            accumsan. Quisque ut interdum orci. Integer ultrices nec arcu egestas sagittis. Ut dapibus felis id sagittis
            aliquet.
        </p>
    </HelpPanel>
);
