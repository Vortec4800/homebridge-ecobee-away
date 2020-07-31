import { createInterface } from 'readline';

export async function requestInput(question: string) {
	const lineReader = createInterface({
			input: process.stdin,
			output: process.stdout,
		}),
		answer = await new Promise<string>((resolve) => {
			lineReader.question(question, resolve);
		});

	lineReader.close();

	return answer.trim();
}
