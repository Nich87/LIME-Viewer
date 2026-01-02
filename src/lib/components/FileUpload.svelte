<script lang="ts">
	import { databaseService, contactsService, mediaService } from '$lib/services';
	import { formatFileSize } from '$lib/utils';
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	interface Props {
		onComplete: () => void;
	}

	let { onComplete }: Props = $props();

	let dbFile: File | null = $state(null);
	let csvFile: File | null = $state(null);
	let backupFiles: FileList | null = $state(null);
	let zipFile: File | null = $state(null);

	let loading = $state(false);
	let error = $state<string | null>(null);
	let progress = $state<string>('');
	let progressPercent = $state(0);

	// Check if running on mobile/Android (set once on mount)
	let isMobile = $state(false);

	// Media upload mode: 'folder' or 'zip'
	let mediaMode = $state<'folder' | 'zip'>('folder');

	// Current step for stepper
	let currentStep = $state(0);

	// Animation states
	let mounted = $state(false);

	onMount(() => {
		isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
			navigator.userAgent
		);
		// Default to zip mode on mobile
		if (isMobile) mediaMode = 'zip';
		// Trigger mount animation
		setTimeout(() => {
			mounted = true;
		}, 100);
	});

	function handleDbChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			dbFile = input.files[0];
			if (currentStep === 0) currentStep = 1;
		}
	}

	function handleCsvChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) csvFile = input.files[0];
	}

	function handleBackupChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			backupFiles = input.files;
			zipFile = null;
		}
	}

	function handleZipChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			zipFile = input.files[0];
			backupFiles = null;
		}
	}

	async function handleSubmit() {
		if (!dbFile) {
			error = 'データベースファイル(.db)は必須です';
			return;
		}

		loading = true;
		error = null;
		progressPercent = 0;

		try {
			// 1. Load database
			progress = 'データベースを読み込み中...';
			progressPercent = 10;
			const dbBuffer = await dbFile.arrayBuffer();
			await databaseService.initialize(dbBuffer);
			progressPercent = 40;

			// 2. Load contacts CSV (optional)
			if (csvFile) {
				progress = '連絡先を読み込み中...';
				progressPercent = 50;
				const csvText = await csvFile.text();
				await contactsService.initialize(csvText);
				progressPercent = 60;
			}

			// 3. Load media files (optional)
			if (zipFile) {
				progress = 'ZIPファイルを解凍中...';
				await mediaService.initializeFromZip(zipFile, (percent) => {
					progressPercent = 60 + Math.floor(percent * 0.35);
					progress = `ZIPファイルを解凍中... ${percent}%`;
				});
			} else if (backupFiles && backupFiles.length > 0) {
				progress = `メディアファイルを読み込み中...`;
				progressPercent = 70;
				await mediaService.initializeFromFolder(backupFiles);
				progressPercent = 95;
			}

			progressPercent = 100;
			progress = '完了！';
			await new Promise((resolve) => setTimeout(resolve, 500));
			onComplete();
		} catch (e) {
			console.error('Failed to load files:', e);
			error = e instanceof Error ? e.message : 'ファイルの読み込みに失敗しました';
		} finally {
			loading = false;
		}
	}

	const steps = [
		{ icon: 'mdi:database', label: 'データベース', color: 'emerald' },
		{ icon: 'mdi:account-multiple', label: '連絡先', color: 'blue' },
		{ icon: 'mdi:folder-image', label: 'メディア', color: 'purple' }
	];
</script>

<!-- Full screen immersive background -->
<div
	class="fixed inset-0 overflow-x-hidden overflow-y-auto bg-linear-to-br from-slate-900 via-emerald-950 to-slate-900"
>
	<!-- Animated background elements -->
	<div class="pointer-events-none fixed inset-0 overflow-hidden">
		<!-- Floating orbs -->
		<div
			class="animate-float-slow absolute top-20 -left-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
		></div>
		<div
			class="animate-float-medium absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl"
		></div>
		<div
			class="animate-float-fast absolute bottom-20 left-1/4 h-64 w-64 rounded-full bg-green-500/10 blur-3xl"
		></div>

		<!-- Grid pattern overlay -->
		<div
			class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-size-[100px_100px]"
		></div>

		<!-- Radial gradient spotlight -->
		<div
			class="bg-gradient-radial absolute top-1/2 left-1/2 h-200 w-200 -translate-x-1/2 -translate-y-1/2 rounded-full from-emerald-500/5 via-transparent to-transparent"
		></div>
	</div>

	<!-- Main content -->
	<div
		class="relative flex min-h-full items-start justify-center px-4 py-6 sm:items-center sm:py-8"
	>
		<div
			class="w-full max-w-2xl transition-all duration-700 ease-out {mounted
				? 'translate-y-0 opacity-100'
				: 'translate-y-8 opacity-0'}"
		>
			<!-- Glass card -->
			<div
				class="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-12"
			>
				<!-- Header -->
				<div class="mb-10 text-center">
					<!-- Animated logo -->
					<div class="relative mb-6 inline-block">
						<div
							class="absolute inset-0 animate-pulse rounded-full bg-emerald-500/20 blur-xl"
						></div>
						<div class="relative h-20 w-20 overflow-hidden rounded-2xl">
							<img
								src="/web-app-manifest-192x192.png"
								alt="LIME Viewer"
								class="h-full w-full scale-105 object-cover"
							/>
						</div>
					</div>
					<h1
						class="bg-linear-to-r from-white to-emerald-200 bg-clip-text text-3xl font-bold text-transparent md:text-4xl"
					>
						LIME Viewer
					</h1>
					<p class="mt-3 text-base text-white/60">LIME Backup Previewer</p>
				</div>

				<!-- Step indicators -->
				<div class="mb-10 flex items-center justify-center gap-3">
					{#each steps as step, i (step.label)}
						<div class="flex items-center">
							<button
								type="button"
								class="group relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300
									{i === 0 && dbFile
									? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
									: i === 1 && csvFile
										? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
										: i === 2 && (backupFiles || zipFile)
											? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
											: 'border border-white/20 bg-white/5 text-white/40 hover:border-white/40 hover:bg-white/10'}"
								onclick={() => (currentStep = i)}
							>
								<Icon icon={step.icon} class="h-5 w-5" />
								{#if (i === 0 && dbFile) || (i === 1 && csvFile) || (i === 2 && (backupFiles || zipFile))}
									<div
										class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white"
									>
										<Icon icon="mdi:check" class="h-3 w-3 text-emerald-600" />
									</div>
								{/if}
							</button>
							{#if i < steps.length - 1}
								<div class="mx-2 h-px w-8 bg-white/20"></div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Upload sections -->
				<div class="space-y-5">
					<!-- Database file -->
					<div class="group">
						<div class="mb-2 flex items-center gap-2">
							<Icon icon="mdi:database" class="h-5 w-5 text-emerald-400" />
							<span class="text-sm font-medium text-white/80">データベースファイル</span>
							<span class="rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-300">必須</span>
						</div>
						<label
							class="relative block w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300
								{dbFile
								? 'border-emerald-500/50 bg-emerald-500/10'
								: 'border-white/20 bg-white/5 hover:border-emerald-400/50 hover:bg-white/10'}"
						>
							<input
								type="file"
								accept=".db"
								class="absolute inset-0 cursor-pointer opacity-0"
								onchange={handleDbChange}
							/>
							<div class="p-5">
								{#if dbFile}
									<div class="flex items-center gap-4">
										<div
											class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20"
										>
											<Icon icon="mdi:file-check" class="h-7 w-7 text-emerald-400" />
										</div>
										<div class="min-w-0 flex-1">
											<p class="truncate font-medium text-white">{dbFile.name}</p>
											<p class="text-sm text-white/50">{formatFileSize(dbFile.size)}</p>
										</div>
										<Icon icon="mdi:check-circle" class="h-6 w-6 shrink-0 text-emerald-400" />
									</div>
								{:else}
									<div class="flex flex-col items-center py-4">
										<div
											class="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5"
										>
											<Icon icon="mdi:cloud-upload" class="h-8 w-8 text-white/40" />
										</div>
										<p class="text-sm text-white/60">naver_line_backup.db を選択</p>
										<p class="mt-1 text-xs text-white/30">クリックまたはドラッグ&ドロップ</p>
									</div>
								{/if}
							</div>
						</label>
					</div>

					<!-- Contacts CSV -->
					<div class="group">
						<div class="mb-2 flex items-center gap-2">
							<Icon icon="mdi:account-multiple" class="h-5 w-5 text-blue-400" />
							<span class="text-sm font-medium text-white/80">連絡先CSV</span>
							<span class="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/40">任意</span>
						</div>
						<label
							class="relative block w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300
								{csvFile
								? 'border-blue-500/50 bg-blue-500/10'
								: 'border-white/20 bg-white/5 hover:border-blue-400/50 hover:bg-white/10'}"
						>
							<input
								type="file"
								accept=".csv,text/csv"
								class="absolute inset-0 cursor-pointer opacity-0"
								onchange={handleCsvChange}
							/>
							<div class="p-4">
								{#if csvFile}
									<div class="flex items-center gap-4">
										<div
											class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/20"
										>
											<Icon icon="mdi:file-check" class="h-6 w-6 text-blue-400" />
										</div>
										<div class="min-w-0 flex-1">
											<p class="truncate font-medium text-white">{csvFile.name}</p>
											<p class="text-sm text-white/50">{formatFileSize(csvFile.size)}</p>
										</div>
										<Icon icon="mdi:check-circle" class="h-6 w-6 shrink-0 text-blue-400" />
									</div>
								{:else}
									<div class="flex items-center gap-4">
										<div
											class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5"
										>
											<Icon icon="mdi:cloud-upload" class="h-6 w-6 text-white/30" />
										</div>
										<div>
											<p class="text-sm text-white/60">contacts_xxxxxxxx.csv を選択</p>
											<p class="text-xs text-white/30">連絡先名を表示するために使用</p>
										</div>
									</div>
								{/if}
							</div>
						</label>
					</div>

					<!-- Media files -->
					<div class="group">
						<div class="mb-2 flex items-center gap-2">
							<Icon icon="mdi:folder-image" class="h-5 w-5 text-purple-400" />
							<span class="text-sm font-medium text-white/80">メディアファイル</span>
							<span class="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/40">任意</span>
						</div>

						<!-- Mode toggle -->
						<div class="mb-3 flex gap-1 rounded-xl bg-white/5 p-1">
							<button
								type="button"
								class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 {mediaMode ===
								'folder'
									? 'bg-purple-500/20 text-purple-300 shadow-sm'
									: 'text-white/40 hover:text-white/60'}"
								onclick={() => {
									mediaMode = 'folder';
									zipFile = null;
								}}
							>
								<Icon icon="mdi:folder" class="mr-2 inline h-4 w-4" />
								フォルダ
							</button>
							<button
								type="button"
								class="flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 {mediaMode ===
								'zip'
									? 'bg-purple-500/20 text-purple-300 shadow-sm'
									: 'text-white/40 hover:text-white/60'}"
								onclick={() => {
									mediaMode = 'zip';
									backupFiles = null;
								}}
							>
								<Icon icon="mdi:folder-zip" class="mr-2 inline h-4 w-4" />
								ZIPファイル
							</button>
						</div>

						{#if mediaMode === 'folder'}
							<label
								class="relative block w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300
									{backupFiles && backupFiles.length > 0
									? 'border-purple-500/50 bg-purple-500/10'
									: 'border-white/20 bg-white/5 hover:border-purple-400/50 hover:bg-white/10'}"
							>
								<input
									type="file"
									class="absolute inset-0 cursor-pointer opacity-0"
									onchange={handleBackupChange}
									{...{ webkitdirectory: true } as object}
								/>
								<div class="p-4">
									{#if backupFiles && backupFiles.length > 0}
										<div class="flex items-center gap-4">
											<div
												class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/20"
											>
												<Icon icon="mdi:folder-check" class="h-6 w-6 text-purple-400" />
											</div>
											<div class="min-w-0 flex-1">
												<p class="truncate font-medium text-white">chats_backup</p>
												<p class="text-sm text-white/50">{backupFiles.length} ファイル</p>
											</div>
											<Icon icon="mdi:check-circle" class="h-6 w-6 shrink-0 text-purple-400" />
										</div>
									{:else}
										<div class="flex items-center gap-4">
											<div
												class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5"
											>
												<Icon icon="mdi:folder-upload" class="h-6 w-6 text-white/30" />
											</div>
											<div>
												<p class="text-sm text-white/60">chats_backup フォルダを選択</p>
												<p class="text-xs text-white/30">※PCブラウザでのみ動作</p>
											</div>
										</div>
									{/if}
								</div>
							</label>
						{:else}
							<label
								class="relative block w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300
									{zipFile
									? 'border-purple-500/50 bg-purple-500/10'
									: 'border-white/20 bg-white/5 hover:border-purple-400/50 hover:bg-white/10'}"
							>
								<input
									type="file"
									accept=".zip,application/zip"
									class="absolute inset-0 cursor-pointer opacity-0"
									onchange={handleZipChange}
								/>
								<div class="p-4">
									{#if zipFile}
										<div class="flex items-center gap-4">
											<div
												class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/20"
											>
												<Icon icon="mdi:folder-zip" class="h-6 w-6 text-purple-400" />
											</div>
											<div class="min-w-0 flex-1">
												<p class="truncate font-medium text-white">{zipFile.name}</p>
												<p class="text-sm text-white/50">{formatFileSize(zipFile.size)}</p>
											</div>
											<Icon icon="mdi:check-circle" class="h-6 w-6 shrink-0 text-purple-400" />
										</div>
									{:else}
										<div class="flex items-center gap-4">
											<div
												class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5"
											>
												<Icon icon="mdi:folder-zip" class="h-6 w-6 text-white/30" />
											</div>
											<div>
												<p class="text-sm text-white/60">chats_backup.zip を選択</p>
												<p class="text-xs text-white/30">chats_backupフォルダをZIP圧縮</p>
											</div>
										</div>
									{/if}
								</div>
							</label>
						{/if}
					</div>

					<!-- Error message -->
					{#if error}
						<div
							class="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
						>
							<Icon icon="mdi:alert-circle" class="h-5 w-5 shrink-0 text-red-400" />
							<p class="text-sm text-red-300">{error}</p>
						</div>
					{/if}

					<!-- Submit button -->
					<button
						onclick={handleSubmit}
						disabled={loading || !dbFile}
						class="group relative mt-6 w-full overflow-hidden rounded-2xl px-6 py-4 font-semibold transition-all duration-300
							{dbFile && !loading
							? 'bg-linear-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40'
							: 'cursor-not-allowed bg-white/10 text-white/30'}"
					>
						{#if loading}
							<!-- Progress bar background -->
							<div
								class="absolute inset-0 bg-linear-to-r from-emerald-600 to-green-700 transition-all duration-300"
								style="width: {progressPercent}%"
							></div>
							<span class="relative flex items-center justify-center gap-3">
								<Icon icon="mdi:loading" class="h-5 w-5 animate-spin" />
								<span>{progress}</span>
								<span class="text-sm opacity-70">{progressPercent}%</span>
							</span>
						{:else}
							<span class="flex items-center justify-center gap-2">
								<Icon
									icon="mdi:rocket-launch"
									class="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
								/>
								プレビューを開始
							</span>
						{/if}
					</button>

					<!-- Privacy notice -->
					<div class="flex items-center justify-center gap-2 pt-4">
						<Icon icon="mdi:shield-check" class="h-4 w-4 text-emerald-400/60" />
						<p class="text-center text-xs text-white/40">
							すべてのデータはブラウザ内でのみ処理され、サーバーには送信されません
						</p>
					</div>
				</div>
			</div>

			<!-- Footer branding -->
			<div class="mt-6 text-center">
				<p class="text-xs text-white/20">Powered by SQL.js • Built with SvelteKit</p>
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes float-slow {
		0%,
		100% {
			transform: translate(0, 0) rotate(0deg);
		}
		33% {
			transform: translate(30px, -30px) rotate(5deg);
		}
		66% {
			transform: translate(-20px, 20px) rotate(-3deg);
		}
	}

	@keyframes float-medium {
		0%,
		100% {
			transform: translate(0, 0) rotate(0deg);
		}
		50% {
			transform: translate(-40px, 30px) rotate(-5deg);
		}
	}

	@keyframes float-fast {
		0%,
		100% {
			transform: translate(0, 0);
		}
		25% {
			transform: translate(20px, -20px);
		}
		50% {
			transform: translate(-10px, 10px);
		}
		75% {
			transform: translate(15px, 5px);
		}
	}

	:global(.animate-float-slow) {
		animation: float-slow 20s ease-in-out infinite;
	}

	:global(.animate-float-medium) {
		animation: float-medium 15s ease-in-out infinite;
	}

	:global(.animate-float-fast) {
		animation: float-fast 10s ease-in-out infinite;
	}

	:global(.bg-gradient-radial) {
		background: radial-gradient(circle, var(--tw-gradient-stops));
	}
</style>
