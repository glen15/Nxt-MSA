// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	integrations: [
		starlight({
			title: 'NxtCar MSA Workshop',
			defaultLocale: 'root',
			locales: { root: { label: '한국어', lang: 'ko' } },
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/glen15/Nxt-MSA' }],
			sidebar: [
				{
					label: '시작하기',
					items: [
						{ label: '시스템 개요', slug: 'labs/lab-00' },
					],
				},
				{
					label: '실습',
					items: [
						{ label: 'Lab 01: 메인 앱 배포', slug: 'labs/lab-01' },
						{ label: 'Lab 02: 공장 서버 탐험', slug: 'labs/lab-02' },
						{ label: 'Lab 03: SNS + SQS 발주', slug: 'labs/lab-03' },
						{ label: 'Lab 04: Lambda 커넥터', slug: 'labs/lab-04' },
						{ label: 'Lab 05: 입고 경로', slug: 'labs/lab-05' },
					],
				},
			],
		}),
	],
});
