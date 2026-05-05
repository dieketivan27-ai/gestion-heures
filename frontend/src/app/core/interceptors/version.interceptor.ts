import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs';

let currentVersion: string | null = null;

export const versionInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        const serverVersion = event.headers.get('x-app-version');
        if (serverVersion) {
          if (!currentVersion) {
            currentVersion = serverVersion;
          } else if (currentVersion !== serverVersion) {
            console.log('🔄 Nouvelle version détectée ! Rafraîchissement...');
            window.location.reload();
          }
        }
      }
    })
  );
};
