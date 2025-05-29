// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/*
 * Collection of functions to generate domain-independent quasi random data.
 */
const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const getRandomLetter = () => alphabet[randomInteger(alphabet.length)];

export function blindText(targetWordCount: number): string {
    return Array.from({ length: targetWordCount }, randomWord).join(' ');
}

export function randomWord(minLength = 5, maxLength = 10): string {
    const difference = Math.abs(maxLength - minLength);
    const wordLength = randomInteger(difference) + minLength;

    const word = Array.from({ length: wordLength }, getRandomLetter).join('');
    return word.charAt(0).toUpperCase() + word.slice(1);
}

export function randomAlias() {
    return randomWord().toLowerCase() + '@';
}

export function randomSentence(minLength = 1, maxLength = 5): string {
    const difference = Math.abs(maxLength - minLength);
    const numberOfWords = randomInteger(difference) + minLength;
    const words = Array.from({ length: numberOfWords }, randomWord);
    return words.join(' ');
}

export function randomInteger(max: number) {
    return Math.floor(Math.random() * max);
}

export function randomDigit(max = 10) {
    return randomInteger(max);
}

export function shuffle<T>(array: T[]): T[] {
    return array.sort(() => 0.5 - Math.random());
}
