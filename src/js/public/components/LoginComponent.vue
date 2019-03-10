<template>
    <b-card>
        <div slot="header">Login</div>

        <div class="form-group row">
            <label for="email" class="col-md-4 col-form-label text-md-right">E-Mail Address</label>

            <div class="col-md-6">
                <input id="email"
                       type="email"
                       class="form-control"
                       :class="{'is-invalid': false}"
                       name="email"
                       required
                       autofocus>

                <span class="invalid-feedback" role="alert">
                            <strong>Email failed</strong>
                        </span>
            </div>
        </div>

        <div class="form-group row">
            <label for="password" class="col-md-4 col-form-label text-md-right">Password</label>

            <div class="col-md-6">
                <input id="password"
                       type="password"
                       class="form-control"
                       :class="{'is-invalid': false}"
                       name="password"
                       required>


                <span class="invalid-feedback" role="alert">
                            <strong>Password failed</strong>
                        </span>
            </div>
        </div>

        <div class="form-group row">
            <div class="col-md-6 offset-md-4">
                <div class="form-check">
                    <input class="form-check-input"
                           type="checkbox"
                           name="remember"
                           id="remember">

                    <label class="form-check-label" for="remember">Remember Me</label>
                </div>
            </div>
        </div>

        <b-row slot="footer" align-h="end">
            <b-col md="8">
                <button type="submit" class="btn btn-primary">
                    Login
                </button>

                <a class="btn btn-link" href="/forgot">
                    Forgot Your Password?
                </a>
            </b-col>
        </b-row>
    </b-card>
</template>

<script>
    export default {
        name: 'LoginComponent',
    }
</script>