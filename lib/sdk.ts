import { IHttp, ILogger } from '@rocket.chat/apps-engine/definition/accessors';

const BaseHost = 'https://github.com/';
const BaseApiHost = 'https://api.github.com/repos/';

export class GithubSDK {
    constructor(private readonly http: IHttp, private readonly accessToken, public logger :ILogger) { }

    public createWebhook(repoName: string, webhookUrl: string) {
        return this.post(BaseApiHost + repoName + '/hooks', {
            active: true,
            events: ['push'],
            config: {
                url: webhookUrl,
                content_type: 'json',
            },
        });
    }

    public getRepos(username: string) {
        this.logger.debug("over here")
        return this.get('https://api.github.com/' + 'users/' + username + '/repos');
    }

    private async post(url: string, data: any): Promise<any> {
        const response = await this.http.post(url, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Rocket.Chat-Apps-Engine',
            },
            data,
        });

        // If it isn't a 2xx code, something wrong happened
        if (!response.statusCode.toString().startsWith('2')) {
            throw response;
        }

        return JSON.parse(response.content || '{}');
    }

    private async get(url: string): Promise<any> {
        const response = await this.http.get(url,{
            headers: {
                // 'Authorization': `Bearer ${this.accessToken}`,
                // 'Content-Type': 'application/json',
                Accept:'application/json',
                // 'User-Agent': 'Rocket.Chat-Apps-Engine',
            }});
        this.logger.debug("over here resp = ", response);
        // If it isn't a 2xx code, something wrong happened
        if (!response.statusCode.toString().startsWith('2')) {
            throw response;
        }

        return JSON.parse(response.content || '{}');
    }
}

export function getRepoName(repoUrl: string): string {
    if (!repoUrl.startsWith(BaseHost)) {
        return '';
    }

    const apiUrl = repoUrl.substring(BaseHost.length);
    const secondSlashIndex = apiUrl.indexOf('/', apiUrl.indexOf('/') + 1);

    return apiUrl.substr(0, secondSlashIndex === -1 ? undefined : secondSlashIndex);
}
